// const fs = require('fs/promises');
const fs = require('fs')
const path = require('path');

const CID = require('cids');
const ipfsClient = require('ipfs-http-client');
const all = require('it-all');
const uint8ArrayConcat = require('uint8arrays/concat').concat;
const uint8ArrayToString = require('uint8arrays/to-string').toString;
const ethers = require('ethers');
const { BigNumber } = require('ethers');
const { selectSchema, promptNFTMetadata, validateSchema } = require('./helpers.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const solc = require('solc');

// The getconfig package loads configuration from files located in the the `config` directory.
// See https://www.npmjs.com/package/getconfig for info on how to override the default config for
// different environments (e.g. testnet, mainnet, staging, production, etc).
const config = require('getconfig');

// ipfs.add parameters for more deterministic CIDs
const ipfsAddOptions = {
  cidVersion: 1,
  hashAlg: 'sha2-256'
};

const ERC721URIStorage_QUERY_ERROR = "ERC721URIStorage: URI query for nonexistent token";

/**
 * Construct and asynchronously initialize a new Minty instance.
 * @returns {Promise<Minty>} a new instance of Minty, ready to mint NFTs.
 */
 async function MakeMinty(opts) {
    const m = new Minty(opts);
    await m.init();
    return m;
}

/**
 * Minty is the main object responsible for storing NFT data and interacting with the smart contract.
 * Before constructing, make sure that the contract has been deployed and a deployment
 * info file exists (the default location is `minty-deployment.json`)
 * 
 * Minty requires async initialization, so the Minty class (and its constructor) are not exported. 
 * To make one, use the async {@link MakeMinty} function.
 */
class Minty {
    constructor(opts) {

        // the name of the smart contract
        this.name = opts.contract || null;
        this.symbol = opts.symbol || null;
        this.token = opts.name || null;
        this.address = opts.address || null;
        // can get address from name if available in config
        if (!isNaN(this.name) && !isNaN(config.contracts[this.name]) && config.contracts[this.name].hasOwnProperty("address"))
            this.address = config.contracts[this.name].address;
        
        // the url of the provider to connect to
        this.host = opts.host || "http://127.0.0.1:8545";
        // the name of the network to connect to
        this.network = opts.network || config.network || null;
        // the network_id matching in truffle-config.js
        this.chainId = opts.chainId || null;
        // can get network data and network_id if name & network exists in config
        if (!isNaN(this.name) && !isNaN(config.contracts[this.name]) && config.contracts[this.name].hasOwnProperty("networks") &&
            config.contracts[name].networks[this.network].hasOwnProperty("network_id"))
            this.chainId = config.contracts[name].networks[this.chainId];
        if (!isNaN(this.name) && !isNaN(config.contracts[this.name]) && config.contracts[this.name].hasOwnProperty("networks") &&
            config.contracts[this.name].networks[this.network].hasOwnProperty("host"))
            this.host = config.contracts[this.name].networks[this.host];

        this.abi = null;
        // ipfs client
        this.ipfs = null;
        // ethers contract object
        this.contract = null;

        this._initialized = false;
    }

    async init() {
        if (this._initialized) {
            return;
        }

        let bytecode, contractJSON = {'networks':[]};

        ///////////////
        // Fetch ABI //
        ///////////////

        // check for migrations file
        if (fileExists(path.join(__dirname, config.buildPath, `${this.name}.json`))) {
            contractJSON = require(path.join(__dirname, config.buildPath, `${this.name}.json`));
            this.abi = contractJSON.abi;
            bytecode = contractJSON.bytecode;
        }
        // check for local smart contract file
        else if (fileExists(path.join(__dirname, config.contractPath, `${this.name}.sol`))) {
            const input = fs.readFileSync(path.join(__dirname, config.contractPath, `${this.name}.sol`));
            const output = solc.compile(input.toString(), 1);
            bytecode = output.contracts[this.name].bytecode;
            this.abi = JSON.parse(output.contracts[this.name].interface);
        }
        // 
        else if (this.address && this.network.name) {

        }

        if (!this.abi) throw "unable to find ABI for contract!";

        /////////////
        // Network //
        /////////////

        const provider = new ethers.providers.StaticJsonRpcProvider(this.host);
        const signer = provider.getSigner();            
        const network = await provider.getNetwork();
        console.debug(`Network connected: ${JSON.stringify(network)}`)
        const networkId = network.chainId;
        // get the deployed contract's address on current network
        console.debug(`Available Networks: ${networkId} <-- current`)
        console.debug(contractJSON.networks)
        // check if contract has been deployed on network, if not then deploy
        if (!isNaN(contractJSON.networks[networkId]) && contractJSON.networks[networkId].hasOwnProperty("address"))
            this.address = contractJSON.networks[networkId].address;
        else {
            try {
                console.log(`Deploying ${this.name} to ${this.network}`);
                // const iface = new ethers.utils.Interface(this.abi);
                const factory = new ethers.ContractFactory(this.abi, bytecode, signer);
                const contract = await factory.deploy(this.token, this.symbol);
                this.address = contract.address;
                await contract.deployTransaction.wait();
            }
            catch (err) {
                console.error(err);
            }
        }

        if (!this.address || !this.abi) throw "unable to connect to contract!";

        ////////////////////
        // Smart Contract //
        ////////////////////

        this.contract = await ethers.Contract(this.address, this.abi, signer);

        //////////
        // IPFS //
        //////////

        // creates a local IPFS node
        this.ipfs = ipfsClient(config.ipfsApiUrl);

        this._initialized = true;
    }

    //////////////////////////////////////////////
    // ------ NFT Creation
    //////////////////////////////////////////////

    /**
     * Create a new NFT from the given asset data.
     * 
     * @param {object} options
     * @param {Buffer|Uint8Array} assets - an array of Buffers or UInt8Arrays of data (e.g. for an image)
     * @param {?string} path - optional file path to set when storing the data on IPFS
     * @param {?string} name - optional name to set in NFT metadata
     * @param {?string} description - optional description to store in NFT metadata
     * @param {?string} owner - optional ethereum address that should own the new NFT. 
     * If missing, the default signing address will be used.
     * 
     * @typedef {object} CreateNFTResult
     * @property {string} tokenId - the unique ID of the new token
     * @property {string} ownerAddress - the ethereum address of the new token's owner
     * @property {object} metadata - the JSON metadata stored in IPFS and referenced by the token's metadata URI
     * @property {string} metadataURI - an ipfs:// URI for the NFT metadata
     * @property {string} metadataGatewayURL - an HTTP gateway URL for the NFT metadata
     * @property {string} assetURI - an ipfs:// URI for the NFT asset
     * @property {string} assetGatewayURL - an HTTP gateway URL for the NFT asset
     * 
     * @returns {Promise<CreateNFTResult>}
     */
    async createNFT(options) {
        console.debug("creating NFT")
        const schema = await selectSchema(options.schema);
        let metadata = await promptNFTMetadata(schema, options);
        const assets = {};
        if (Array.isArray(options.assets) && options.assets.length > 0)
            for (const [key, filePath] in options.assets) {
                const {assetCID, assetURI} = await this.uploadAssetData(filePath, options);
                assets[key].cid = assetCID;
                assets[key].uri = assetURI;
            }
        metadata = await this.makeNFTMetadata(assets, options, metadata);
        const assetURIs = metadata.assetURIs;
        delete metadata.assetURIs;
        validateSchema(metadata, schema);
        // add the metadata to IPFS
        const { cid: metadataCid } = await this.ipfs.add({ path: `/${options.contract}/nfts/metadata/${metadata.name}.json`, content: JSON.stringify(metadata)}, ipfsAddOptions);
        const metadataURI = ensureIpfsUriPrefix(metadataCid) + `/${options.contract}/metadata/${metadata.name}.json`;
        // get the address of the token owner from options, or use the default signing address if no owner is given
        let ownerAddress = options.owner;
        if (!ownerAddress) {
            ownerAddress = await this.defaultOwnerAddress();
        }
        let tokenId = null;
        if (isNaN(options.skipMint) && !options.skipMint) {
            // mint a new token referencing the metadata URI
            tokenId = await this.mint(ownerAddress, metadataURI);
        }
        return {
            tokenId,
            ownerAddress,
            metadata,
            metadataURI,
            metadataGatewayURL: makeGatewayURL(metadataURI),
            assetURIs: assetURIs,
            assetsGatewayURLs: assetURIs.map(a => makeGatewayURL(a))
        };
    }

    /**
     * Helper to construct metadata JSON for 
     * @param {string} assetCid - IPFS URI for the NFT asset
     * @param {object} options
     * @param {?string} name - optional name to set in NFT metadata
     * @param {?string} description - optional description to store in NFT metadata
     * @returns {object} - NFT metadata object
     */
    async makeNFTMetadata(assets, options, metadata={}) {
        const assetURIs = [];
        metadata.name = options.name; // args overwrites
        metadata.description = options.description; // args overwrites
        for (const [key, values] of assets) {
            metadata[key] = ensureIpfsUriPrefix(values.uri);
            assetURIs.push(metadata[key]);
        }
        metadata.assetURIs = assetURIs;
        return metadata;
    }

    async uploadAssetData(filePath, options, folderName="assets") {
        // add the asset to IPFS
        // const filePath = options.path || 'asset.bin';
        const basename =  path.basename(filePath);
        const content = await fs.readFile(filePath);
        // When you add an object to IPFS with a directory prefix in its path,
        // IPFS will create a directory structure for you. This is nice, because
        // it gives us URIs with descriptive filenames in them e.g.
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
        const ipfsPath = `${options.contract}/nfts/${folderName}/${basename}`;
        const { cid: assetCid } = await this.ipfs.add({ path: ipfsPath, content }, ipfsAddOptions);
        // make the NFT metadata JSON
        const assetURI = ensureIpfsUriPrefix(assetCid) + '/' + basename;
        return {
            assetCid, assetURI, assetGatewayURL: makeGatewayURL(assetURI)
        };
        // return {
        //     assetCid, assetURI,
        //     assetGatewayURL: makeGatewayURL(assetURI)
        // };
    }

    //////////////////////////////////////////////
    // -------- NFT Retreival
    //////////////////////////////////////////////

    /**
     * Get information about an existing token. 
     * By default, this includes the token id, owner address, metadata, and metadata URI.
     * To include info about when the token was created and by whom, set `opts.fetchCreationInfo` to true.
     * To include the full asset data (base64 encoded), set `opts.fetchAsset` to true.
     *
     * @param {string} tokenId
     * @param {object} opts
     * @param {?boolean} opts.fetchAsset - if true, asset data will be fetched from IPFS and returned in assetData (base64 encoded)
     * @param {?boolean} opts.fetchCreationInfo - if true, fetch historical info (creator address and block number)
     * 
     * 
     * @typedef {object} NFTInfo
     * @property {string} tokenId
     * @property {string} ownerAddress
     * @property {object} metadata
     * @property {string} metadataURI
     * @property {string} metadataGatewayURI
     * @property {string} assetURI
     * @property {string} assetGatewayURL
     * @property {?string} assetDataBase64
     * @property {?object} creationInfo
     * @property {string} creationInfo.creatorAddress
     * @property {number} creationInfo.blockNumber
     * @returns {Promise<NFTInfo>}
     */
    async getNFT(tokenId, opts) {
        const {metadata, metadataURI} = await this.getNFTMetadata(tokenId);
        const ownerAddress = await this.getTokenOwner(tokenId);
        const metadataGatewayURL = makeGatewayURL(metadataURI);
        const {fetchAsset, fetchCreationInfo} = (opts || {})
        const assets = [];
        for (const [key, value] of metadata)
            if (config.assetTypes.includes(key)) {
                const asset = {
                    assetURI: value,
                    assetGatewayURL: makeGatewayURL(value)
                };
                if (fetchAsset) asset.base64 = await this.getIPFSBase64(value);
                assets.push(asset);
            }
        const nft = {tokenId, metadata, metadataURI, metadataGatewayURL, ownerAddress, assets};
        if (fetchCreationInfo) {
            nft.creationInfo = await this.getCreationInfo(tokenId);
        }
        return nft;
    }

    /**
     * Fetch the NFT metadata for a given token id.
     * 
     * @param tokenId - the id of an existing token
     * @returns {Promise<{metadata: object, metadataURI: string}>} - resolves to an object containing the metadata and
     * metadata URI. Fails if the token does not exist, or if fetching the data fails.
     */
    async getNFTMetadata(tokenId) {
        try {
            const metadataURI = await this.contract.tokenURI(tokenId);
            const metadata = await this.getIPFSJSON(metadataURI);

            return {metadata, metadataURI};
        }
        catch (err) {
            if (err.hasOwnProperty("reason") && err.reason === ERC721URIStorage_QUERY_ERROR)
                throw "Token id does not exist!";
        }
    }

    //////////////////////////////////////////////
    // --------- Smart contract interactions
    //////////////////////////////////////////////

    /**
     * Create a new NFT token that references the given metadata CID, owned by the given address.
     * 
     * @param {string} ownerAddress - the ethereum address that should own the new token
     * @param {string} metadataURI - IPFS URI for the NFT metadata that should be associated with this token
     * @returns {Promise<string>} - the ID of the new token
     */
    async mint(ownerAddress, metadataURI) {
        // the smart contract adds an ipfs:// prefix to all URIs, so make sure it doesn't get added twice
        metadataURI = stripIpfsUriPrefix(metadataURI);

        // Calculate gas limit for more complicated contract transactions
        const gasLimit = await this.contract.estimateGas.mintToken(ownerAddress, metadataURI);

        // Call the mint method to issue a new token to the given address
        // This returns a transaction object, but the transaction hasn't been confirmed
        // yet, so it doesn't have our token id.
        // - BUG: for some reason contract.mint won't work? so always use mintToken? as method name?
        const tx = await this.contract.mintToken(ownerAddress, metadataURI, {'gasLimit':gasLimit});

        // The OpenZeppelin base ERC721 contract emits a Transfer event when a token is issued.
        // tx.wait() will wait until a block containing our transaction has been mined and confirmed.
        // The transaction receipt contains events emitted while processing the transaction.
        const receipt = await tx.wait();
        for (const event of receipt.events) {
            if (event.event !== 'Transfer') {
                console.log('ignoring unknown event type ', event.event);
                continue;
            }
            return event.args.tokenId.toString();
        }

        throw new Error('unable to get token id');
    }

    async transferToken(tokenId, toAddress) {
        const fromAddress = await this.getTokenOwner(tokenId);

        // because the base ERC721 contract has two overloaded versions of the safeTranferFrom function,
        // we need to refer to it by its fully qualified name.
        const tranferFn = this.contract['safeTransferFrom(address,address,uint256)'];
        const tx = await tranferFn(fromAddress, toAddress, tokenId);

        // wait for the transaction to be finalized
        await tx.wait();
    }

    /**
     * @returns {Promise<string>} - the default signing address that should own new tokens, if no owner was specified.
     */
    async defaultOwnerAddress() {
        const signers = await ethers.getSigners();
        return signers[0].address;
    }

    /**
     * Get the address that owns the given token id.
     * 
     * @param {string} tokenId - the id of an existing token
     * @returns {Promise<string>} - the ethereum address of the token owner. Fails if no token with the given id exists.
     */
    async getTokenOwner(tokenId) {
        return this.contract.ownerOf(tokenId);
    }

    /**
     * Get historical information about the token.
     * 
     * @param {string} tokenId - the id of an existing token
     * 
     * @typedef {object} NFTCreationInfo
     * @property {number} blockNumber - the block height at which the token was minted
     * @property {string} creatorAddress - the ethereum address of the token's initial owner
     * 
     * @returns {Promise<NFTCreationInfo>}
     */
    async getCreationInfo(tokenId) {
        const filter = await this.contract.filters.Transfer(
            null,
            null,
            BigNumber.from(tokenId)
        );

        const logs = await this.contract.queryFilter(filter);
        const blockNumber = logs[0].blockNumber;
        const creatorAddress = logs[0].args.to;
        return {
            blockNumber,
            creatorAddress,
        };
    }

    //////////////////////////////////////////////
    // --------- IPFS helpers
    //////////////////////////////////////////////

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<Uint8Array>} - contents of the IPFS object
     */
    async getIPFS(cidOrURI) {
        const cid = stripIpfsUriPrefix(cidOrURI);
        return uint8ArrayConcat(await all(this.ipfs.cat(cid)));
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and return it as a string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - the contents of the IPFS object as a string
     */
    async getIPFSString(cidOrURI) {
        const bytes = await this.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes);
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI, and return it as a base64 encoded string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
     */
    async getIPFSBase64(cidOrURI) {
        const bytes = await this.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes, 'base64');
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
     *  
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
     */
    async getIPFSJSON(cidOrURI) {
        const str = await this.getIPFSString(cidOrURI);
        return JSON.parse(str);
    }

    //////////////////////////////////////////////
    // -------- Pinning to remote services
    //////////////////////////////////////////////

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} tokenId - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pinTokenData(tokenId) {
        const {metadata, metadataURI} = await this.getNFTMetadata(tokenId);
        const {image: assetURI} = metadata;
        
        console.log(`Pinning asset data (${assetURI}) for token id ${tokenId}....`);
        await this.pin(assetURI);

        console.log(`Pinning metadata (${metadataURI}) for token id ${tokenId}...`);
        await this.pin(metadataURI);

        return {assetURI, metadataURI};
    }

    /**
     * Request that the remote pinning service pin the given CID or ipfs URI.
     * 
     * @param {string} cidOrURI - a CID or ipfs:// URI
     * @returns {Promise<void>}
     */
    async pin(cidOrURI) {
        const cid = extractCID(cidOrURI);

        // Make sure IPFS is set up to use our preferred pinning service.
        await this._configurePinningService();

        // Check if we've already pinned this CID to avoid a "duplicate pin" error.
        const pinned = await this.isPinned(cid);
        if (pinned) {
            return;
        }

        // Ask the remote service to pin the content.
        // Behind the scenes, this will cause the pinning service to connect to our local IPFS node
        // and fetch the data using Bitswap, IPFS's transfer protocol.
        await this.ipfs.pin.remote.add(cid, { service: config.pinningService.name });
    }


    /**
     * Check if a cid is already pinned.
     * 
     * @param {string|CID} cid 
     * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
     */
    async isPinned(cid) {
        if (typeof cid === 'string') {
            cid = new CID(cid);
        }

        const opts = {
            service: config.pinningService.name,
            cid: [cid], // ls expects an array of cids
        };
        for await (const result of this.ipfs.pin.remote.ls(opts)) {
            return true;
        }
        return false;
    }

    /**
     * Configure IPFS to use the remote pinning service from our config.
     * 
     * @private
     */
    async _configurePinningService() {
        if (!config.pinningService) {
            throw new Error(`No pinningService set up in minty config. Unable to pin.`);
        }

        // check if the service has already been added to js-ipfs
        for (const svc of await this.ipfs.pin.remote.service.ls()) {
            if (svc.service === config.pinningService.name) {
                // service is already configured, no need to do anything
                return;
            }
        }

        // add the service to IPFS
        const { name, endpoint, key } = config.pinningService
        if (!name) {
            throw new Error('No name configured for pinning service');
        }
        if (!endpoint) {
            throw new Error(`No endpoint configured for pinning service ${name}`);
        }
        if (!key) {
            throw new Error(`No key configured for pinning service ${name}.` +
              `If the config references an environment variable, e.g. '$$PINATA_API_TOKEN', ` + 
              `make sure that the variable is defined.`);
        }
        await this.ipfs.pin.remote.service.add(name, { endpoint, key });
    }
}

//////////////////////////////////////////////
// -------- URI helpers
//////////////////////////////////////////////

/**
 * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
 * @returns the input string with the `ipfs://` prefix stripped off
 */
 function stripIpfsUriPrefix(cidOrURI) {
    if (cidOrURI.startsWith('ipfs://')) {
        return cidOrURI.slice('ipfs://'.length);
    }
    return cidOrURI;
}

function ensureIpfsUriPrefix(cidOrURI) {
    let uri = cidOrURI.toString()
    if (!uri.startsWith('ipfs://')) {
        uri = 'ipfs://' + cidOrURI;
    }
    // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
    if (uri.startsWith('ipfs://ipfs/')) {
      uri = uri.replace('ipfs://ipfs/', 'ipfs://');
    }
    return uri;
}

/**
 * Return an HTTP gateway URL for the given IPFS object.
 * @param {string} ipfsURI - an ipfs:// uri or CID string
 * @returns - an HTTP url to view the IPFS object on the configured gateway.
 */
function makeGatewayURL(ipfsURI) {
    return config.ipfsGatewayUrl + '/' + stripIpfsUriPrefix(ipfsURI);
}

/**
 * 
 * @param {string} cidOrURI - an ipfs:// URI or CID string
 * @returns {CID} a CID for the root of the IPFS path
 */
function extractCID(cidOrURI) {
    // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
    const cidString = stripIpfsUriPrefix(cidOrURI).split('/')[0];
    return new CID(cidString);
}

async function fileExists(path) {
    // try {
        return fs.access(path, fs.F_OK, (err) => {
            if (err) {
                console.log(e);
                return false;
            }
            return true;
        });
    // } catch (e) {
        // console.log(e)
        // return false;
    // }
}

async function fetchABI(address, network="mainnet", blockchain="ethereum") {
    if (blockchain == "ethereum") {
        const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${address}`);
        const data = await response.json();
        return JSON.parse(data.result);
    }
    console.error("Unable to find ABI!");
    return {};   
}

// translate network url to legible name
function getNetworkName(network) {
    // TODO
    // check config file for network w/ url that matches
    // return the labeled name of the network
    return "development";
}

function getNetworkURL(networkName) {

}

//////////////////////////////////////////////
// -------- Exports
//////////////////////////////////////////////

module.exports = {
    MakeMinty
}
