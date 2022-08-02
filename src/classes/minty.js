// const fs = require('fs/promises');
const fs = require('fs')
const path = require('path');

const CID = require('cids');
const all = require('it-all');
const uint8ArrayConcat = require('uint8arrays/concat').concat;
const uint8ArrayToString = require('uint8arrays/to-string').toString;
const ethers = require('ethers');
const { BigNumber } = require('ethers');
const { selectSchema, promptNFTMetadata, validateSchema } = require('../utils/prompt.js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const solc = require('solc');

const { fileExists } = require('../utils/helpers.js');
const { IPFS } = require('./ipfs.js');

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
            // get abi from etherscan, etc
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
        this.ipfs = new IPFS();

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
    // TODO
    // make sure this works
    // finish return value of cli output
    async createNFT(options) {
        const nft = new NFT(options);
        await nft.init();
        const metadata = NFT.validate(nft.metadata, nft.schema);
        const { metadataCid, metadataURI } = await nft.upload();
        // get the address of the token owner from options, or use the default signing address if no owner is given
        const to = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
        if (!options.skipMint) await this.mint(to, metadataURI);
        return nft;
        // return {
        //     tokenId,
        //     ownerAddress,
        //     metadata,
        //     metadataURI,
        //     metadataGatewayURL: makeGatewayURL(metadataURI),
        //     assetURIs: assetURIs,
        //     assetsGatewayURLs: assetURIs.map(a => makeGatewayURL(a))
        // };
    }

    // TODO
    // probably mostly same as above or uses above
    async createNFTs(options, schema) {}

    // TODO
    // updates an ipns nft's metadata
    async updateNFT(nft, options) {}

    //////////////////////////////////////////////
    // -------- NFT Retreival
    //////////////////////////////////////////////


    /**
     * Fetch the NFT metadata for a given token id.
     * 
     * @param tokenId - the id of an existing token
     * @returns {Promise<{metadata: object, metadataURI: string}>} - resolves to an object containing the metadata and
     * metadata URI. Fails if the token does not exist, or if fetching the data fails.
     */
    async getMetadata(tokenId) {
        try {
            const metadataURI = await this.contract.tokenURI(tokenId);
            const metadata = await this.ipfs.getIPFSJSON(metadataURI);
            return {metadata, metadataURI};
        }
        catch (err) {
            if (err.hasOwnProperty("reason") && err.reason === ERC721URIStorage_QUERY_ERROR)
                throw "Token id does not exist!";
        }
    }

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
        const {metadata, metadataURI} = await this.getMetadata(tokenId);
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
                if (fetchAsset) asset.base64 = await this.ipfs.getIPFSBase64(value);
                assets.push(asset);
            }
        const nft = {tokenId, metadata, metadataURI, metadataGatewayURL, ownerAddress, assets};
        if (fetchCreationInfo) {
            nft.creationInfo = await this.getCreationInfo(tokenId);
        }
        return nft;
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
        // the smart contract might add an ipfs:// prefix to all URIs, so make sure it doesn't get added twice
        const metadataURI = this.ipfs.stripIpfsUriPrefix(metadataURI);
        // "dynamic" mint functionality
        const mintFunction = config.mintFunction || "mint";
        if (!this.contract.hasOwnProperty(mintFunction)) throw "minting contract is missing a declared mint function";
        // Calculate gas limit for more complicated contract transactions
        const gasLimit = await this.contract.estimateGas[mintFunction](ownerAddress, metadataURI);
        // - BUG: for some reason contract.mint won't work? so always use mintToken? as method name?
        const tx = await this.contract[mintFunction](ownerAddress, metadataURI, {'gasLimit':gasLimit});
        const receipt = await tx.wait();
        this.parseEvents(receipt);
    }

    possibly combine the mint and mint batch based on argument lengths, etc?

    async mintBatch(ownerAddresses, metadataURIs) {
        if (ownerAddresses.length!=metadataURIs) throw "minting lengths mismatch";
        const mintFunction = config.mintBatchFunction || "mint";
        if (!this.contract.hasOwnProperty(mintFunction)) throw "minting contract is missing a declared mint function";
        for (let i=0;i<metadataURIs.length;i++)
            metadataURIs[i] = this.ipfs.stripIpfsUriPrefix(metadataURIs[i]);
        const gasLimit = await this.contract.estimateGas[mintFunction](ownerAddresses, metadataURIs);
        const tx = await this.contract[mintFunction](ownerAddresses, metadataURIs, {'gasLimit':gasLimit});
        const receipt = await tx.wait();
        this.parseEvents(receipt);
    }


    parseEvents(receipt) {

        // if minty contract is an ERC1155, the event is: TransferBatch
        // if minty contract is an ERC721 that handles batch minting via single mint: multiple Transfer events

        // batch:
        // TransferSingle
        // TransferBatch

        // if minty contract is an ERC721 or ERC20, the event is: Transfer
        // if minty contract is an ERC1155, the event is: TransferSingle

        for (const event of receipt.events) {
            if (event.event !== 'Transfer') {
                console.log('ignoring unknown event type ', event.event);
                continue;
            }
            return event.args.tokenId.toString();
        }

        throw new Error('unable to get token id');
    }

    // TODO
    // add missing docs for this
    async transferToken(tokenId, toAddress) {
        const fromAddress = await this.getTokenOwner(tokenId);

        // TODO
        // gonna need to update how this references the base transfer function when using multiple token standards

        // because the base ERC721 contract has two overloaded versions of the safeTranferFrom function,
        // we need to refer to it by its fully qualified name.
        const tranferFn = this.contract['safeTransferFrom(address,address,uint256)'];
        const tx = await tranferFn(fromAddress, toAddress, tokenId);



        // wait for the transaction to be finalized
        await tx.wait();
    }



    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////















    /**
     * @returns {Promise<string>} - the default signing address that should own new tokens, if no owner was specified.
     */
    async defaultOwnerAddress() {
        const signers = await ethers.getSigners();
        return signers[0].address;
    }

    async defaultRecipientAddress() {
        return null;
    }






    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////







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
        const filter = await this.contract.filters.Transfer(null, null, BigNumber.from(tokenId));
        const logs = await this.contract.queryFilter(filter);
        const blockNumber = logs[0].blockNumber;
        const creatorAddress = logs[0].args.to;
        return {
            blockNumber,
            creatorAddress,
        };
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
        const {metadata, metadataURI} = await this.getMetadata(tokenId);
        const assets = await this.getAssetsFromMetadata(metadata);
        const assetURIs = [];
        for (const [key, value] of assets) {
            console.log(`Pinning asset data (${key}) for token id ${tokenId}....`);
            await this.pin(value);
            assetURIs.push(value);
        }
        console.log(`Pinning metadata (${metadataURI}) for token id ${tokenId}...`);
        await this.pin(metadataURI);
        return {assetURIs, metadataURI};
    }

    /**
     * Request that the remote pinning service pin the given CID or ipfs URI.
     * 
     * @param {string} cidOrURI - a CID or ipfs:// URI
     * @returns {Promise<void>}
     */
    async pin(cidOrURI) {
        await this.ipfs.pin(cidOrURI);
    }

    /**
     * Check if a cid is already pinned.
     * 
     * @param {string|CID} cid 
     * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
     */
    async isPinned(cid) {
        return await this.ipfs.isPinned(cid);
    }









    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



    // TODO
    // retrieves [key, value] pairs from provided {} metadata
    async getAssetsFromMetadata(metadata) {}





    // TODO
    // finish this
    // upload the metadata itself
        // does not upload assets
    async upload(options) {

        await this.uploadAssets();
        await this.uploadMetadata();
        
        return {};
    }

    async uploadMetadata() {
        // add the metadata to IPFS
        const { cid: metadataCid } = await this.ipfs.add({ path: `/${this.contract}/nfts/metadata/${this.metadata.name}.json`, content: JSON.stringify(this.metadata)}, IPFS.ipfsAddOptions);
        const metadataURI = IPFS.ensureIpfsUriPrefix(metadataCid) + `/${this.contract}/metadata/${this.metadata.name}.json`;
        return { metadataCid, metadataURI };
    }

    // upload all associated assets
    async uploadAsset(filePath, folderName="assets") {
        // add the asset to IPFS
        // const filePath = options.path || 'asset.bin';
        const basename =  path.basename(filePath);
        const content = await fs.readFile(filePath);
        // When you add an object to IPFS with a directory prefix in its path,
        // IPFS will create a directory structure for you. This is nice, because
        // it gives us URIs with descriptive filenames in them e.g.
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
        const ipfsPath = `${this.contract}/nfts/${folderName}/${basename}`;
        const { cid: assetCid } = await IPFS.add({ path: ipfsPath, content }, IPFS.ipfsAddOptions);
        // make the NFT metadata JSON
        const assetURI = IPFS.ensureIpfsUriPrefix(assetCid) + '/' + basename;
        return {
            assetCid, assetURI, assetGatewayURL: IPFS.makeGatewayURL(assetURI)
        };
    }

    // asset objects as key pairs: 'image':'imagePath'
    async uploadAssets(assetObjects={}) {
        const assets = {};
        for (const [key, filePath] in assetObjects) {
            const {assetCID, assetURI} = await this.uploadAsset(filePath, `assets/${key}`);
            assets[key].cid = assetCID;
            assets[key].uri = IPFS.ensureIpfsUriPrefix(assetURI);
        }
        this.assets = { ...this.assets, assets };
    }

}

//////////////////////////////////////////////
// -------- Exports
//////////////////////////////////////////////

module.exports = {
    MakeMinty,
    Minty
}



























// async function fetchABI(address, network="mainnet", blockchain="ethereum") {
//     if (blockchain == "ethereum") {
//         const response = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${address}`);
//         const data = await response.json();
//         return JSON.parse(data.result);
//     }
//     console.error("Unable to find ABI!");
//     return {};   
// }

// // translate network url to legible name
// function getNetworkName(network) {
//     // TODO
//     // check config file for network w/ url that matches
//     // return the labeled name of the network
//     return "development";
// }

// function getNetworkURL(networkName) {}