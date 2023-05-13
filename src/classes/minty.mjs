// import "fs/promises"
import "fs";
import "path";

import "ethers";
import { BigNumber } from 'ethers';
import 'solc';

import { fileExists } from '../utils/helpers.mjs';
import IPFS from './ipfs.mjs';
import NFT from './nft.mjs';

// The getconfig package loads configuration from files located in the the `config` directory.
// See https://www.npmjs.com/package/getconfig for info on how to override the default config for
// different environments (e.g. testnet, mainnet, staging, production, etc).
import config from 'getconfig';

const ERC721URIStorage_QUERY_ERROR = "ERC721URIStorage: URI query for nonexistent token";

/**
 * Construct and asynchronously initialize a new Minty instance.
 * @returns {Promise<Minty>} a new instance of Minty, ready to mint NFTs.
 */
export const MakeMinty = async function(opts) {
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
    constructor(opts={}) {
        // NFT class
        this.token = opts.token || null;
        // the url of the provider to connect to
        this.host = opts.host || "http://127.0.0.1:8545";
        // the name of the network to connect to
        this.network = opts.network || config.network || null;
        
        this.account = undefined; // the signing 0x account
        this.contract = undefined; // ethers contract object
        this.signer = undefined; // ethers signer object

        this._initialized = false;
    }

    async init() {
        if (this._initialized) return;
        console.debug("initializing Minty...");

        const { token } = this.token instanceof NFT ? this.token : new NFT(this.token);
        this.token = token;

        const { account, network, signer } = await _initializeEthers(this.host)
        this.account = account;
        this.network = network.name;
        this.signer = signer;

        // load abi and any available contract json
        const { abi, bytecode, contractJSON } = this._loadABI(account, network, token); 

        const { address, contract } = await _initializeContract(abi, bytecode, contractJSON)
        this.address = address;

        if (!address && !abi) throw new Error("unable to connect to contract!");

        this.contract = await new ethers.Contract(address, abi, signer);

        console.debug("initialized Minty");
        this._initialized = true;
    }

    async _initializeEthers(host) {
        const provider = new ethers.providers.StaticJsonRpcProvider(host);
        const signer = provider.getSigner();            
        const account = await signer.getAddress();
        const network = await provider.getNetwork();
        console.debug(`network connected: ${JSON.stringify(network)}`)
        return { account, network, signer };
    }

    async _initializeContract(abi, bytecode, contractJSON) {
        // get the deployed contract's address on current network
        // console.debug(`Available Networks: ${networkId} <-- current`)
        // console.debug(contractJSON.networks)
        // check if contract has been deployed on network, if not then deploy
        if (!isNaN(contractJSON.networks[networkId]) && contractJSON.networks[networkId].hasOwnProperty("address"))
            return { address: contractJSON.networks[networkId].address };
        else {
            try {
                // console.log(`Deploying ${this.name} to ${this.network}`);
                // const iface = new ethers.utils.Interface(abi);
                const factory = new ethers.ContractFactory(abi, bytecode, signer);
                const contract = await factory.deploy(this.name, this.symbol);
                await contract.deployTransaction.wait();
                return { address: contract.address };
            }
            catch (err) {
                console.error(err);
            }
        }
        return {}
    }

    _loadABI(account, network, token) {
        let contractJSON = {'networks':[]},
            abi = null,
            bytecode = null;
        // check for migrations file
        if (fileExists(path.join(__dirname, "../..", config.buildPath, `${token.name}.json`))) {
            contractJSON = require(path.join(__dirname, "../..", config.buildPath, `${token.name}.json`));
            abi = contractJSON.abi;
            bytecode = contractJSON.bytecode;
        }
        // check for local smart contract file
        else if (fileExists(path.join(__dirname, "../..", config.contractPath, `${token.name}.sol`))) {
            const input = fs.readFileSync(path.join(__dirname, "../..", config.contractPath, `${token.name}.sol`));
            const output = solc.compile(input.toString(), 1);
            bytecode = output.contracts[token.name].bytecode;
            abi = JSON.parse(output.contracts[token.name].interface);
        }
        // 
        else if (account && network) {
            // get abi from etherscan, etc
        }
        if (!abi) throw new Error("unable to find ABI for contract!");
        return { abi, bytecode, contractJSON };
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
    async mintNFT(options, skipMint=false) {
        if (skipMint)
            console.debug(`practicing token mint...`);
        else
            console.debug(`minting token...`);
        
        const nft = new NFT({...options, ...this});
        await nft.upload();
        // get the address of the token owner from options, or use the default signing address if no owner is given
        if (!skipMint&&!options.skipMint) {
            // nft.owner = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
            nft.tokenId  = await this.mint(nft.owner, nft.metadataURI);
        }

        if (skipMint)
            console.debug(`pretend token:`);
        else 
            console.debug(`minted token:`);
        console.debug(nft.toString());
        return nft;
    }

    // TODO
    // probably mostly same as above or uses above
    async mintNFTs(options, schema) {}

    // TODO
    // updates an ipns nft's metadata
    async updateNFT(tokenId, options) {}

    // TODO
    async burnNFT(tokenId, options) {}

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
            const metadata = await IPFS.getIPFSJSON(metadataURI);
            return {metadata, metadataURI};
        }
        catch (err) {
            if (err.hasOwnProperty("reason") && err.reason === ERC721URIStorage_QUERY_ERROR)
                throw new Error("Token id does not exist!");
            throw new Error(err.message);
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
    async getNFT(tokenId) {
        console.debug(`Getting token id ${tokenId}...`);
        const nft = new NFT({...this});
        nft.tokenId = tokenId;
        const { metadata, metadataURI } = await this.getMetadata(tokenId);
        nft.metadata = metadata;
        nft.metadataCID = IPFS.extractCID(metadataURI);
        nft.metadataURI = metadataURI;
        nft.owner = await this.getTokenOwner(tokenId);
        console.log(`Got token id ${tokenId}.`);
        return nft;
    }

    // return the requested asset data found in the token metadata
    async getNFTProp(tokenId, _prop="image") {
        console.log(`Getting ${_prop} for token id ${tokenId}...`);
        const nft = await this.getNFT(tokenId);
        const prop = nft.getProperty(_prop);
        console.log(`Got ${_prop} for token id ${tokenId}.`);
        return prop;
    }

    // return all the properties found in the token metadata
    async getNFTProperties(tokenId) {
        console.log(`Getting properties for token id ${tokenId}...`);
        const nft = await this.getNFT(tokenId);
        const props = nft.getProperties();
        console.log(`Got properties for token id ${tokenId}.`);
        return props;
    }

    async getNFTAttr(tokenId, _attr="image") {
        console.log(`Getting ${_attr} for token id ${tokenId}...`);
        const nft = await this.getNFT(tokenId);
        const attr = nft.getAttribute(_attr);
        console.log(`Got ${_attr} for token id ${tokenId}.`);
        return attr;
    }

    // return all the properties found in the token metadata
    async getNFTAttributes(tokenId) {
        console.log(`Getting attributes for token id ${tokenId}...`);
        const nft = await this.getNFT(tokenId);
        const attrs = nft.getAttributes();
        console.log(`Got attributes for token id ${tokenId}.`);
        return attrs;
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
        metadataURI = IPFS.stripIpfsUriPrefix(metadataURI);
        console.debug(`Minting uri for address...\n${ownerAddress} : ${metadataURI}`)
        // "dynamic" mint functionality
        const mintFunction = config.mintFunction || "mint";
        if (!this.contract.hasOwnProperty(mintFunction)) throw new Error("minting contract is missing a declared mint function");
        // Calculate gas limit for more complicated contract transactions
        const gasLimit = await this.contract.estimateGas[mintFunction](ownerAddress, metadataURI);
        // - BUG: for some reason contract.mint won't work? so always use mintToken? as method name?
        const tx = await this.contract[mintFunction](ownerAddress, metadataURI, {'gasLimit':gasLimit});
        const receipt = await tx.wait();
        const tokenId = parseTokenId(receipt);
        console.debug(`Minted token id ${tokenId}.`);
        return tokenId;
    }

    // TODO
    // double check
    async mintBatch(ownerAddresses, metadataURIs) {
        if (ownerAddresses.length!=metadataURIs) throw "minting lengths mismatch";
        const mintFunction = config.mintBatchFunction || "mint";
        if (!this.contract.hasOwnProperty(mintFunction)) throw "minting contract is missing a declared mint function";
        for (let i=0;i<metadataURIs.length;i++)
            metadataURIs[i] = IPFS.stripIpfsUriPrefix(metadataURIs[i]);
        const gasLimit = await this.contract.estimateGas[mintFunction](ownerAddresses, metadataURIs);
        const tx = await this.contract[mintFunction](ownerAddresses, metadataURIs, {'gasLimit':gasLimit});
        const receipt = await tx.wait();
        parseTokenId(receipt);(receipt);
    }

    // TODO
    // add missing docs for this
    // also finish
    async transfer(tokenId, toAddress) {
        console.debug(`Transfering token id ${tokenId} to ${toAddress}...`)
        const fromAddress = await this.getTokenOwner(tokenId);

        // TODO
        // gonna need to update how this references the base transfer function when using multiple token standards

        // because the base ERC721 contract has two overloaded versions of the safeTranferFrom function,
        // we need to refer to it by its fully qualified name.
        const tranferFn = this.contract['safeTransferFrom(address,address,uint256)'];
        const tx = await tranferFn(fromAddress, toAddress, tokenId);

        // wait for the transaction to be finalized
        await tx.wait();
        console.debug(`Transferred token id ${tokenId}.`)
    }

    // TODO
    // batch transfers
    async transferBatch(tokenIds, toAddresses) {}

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @returns {Promise<string>} - the default signing address that should own new tokens, if no owner was specified.
     */
    async defaultOwnerAddress() {
        return this.owner;
        // if (this.signer) return this.signer;
        // TODO
        // only works with hardhat
        // const signers = await ethers.getSigners();
        // const [owner, addr1] = await ethers.getSigners();
        // return signers[0].address;
        return null;
    }

    // TODO
    // add another check here
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
    async pin(tokenId) {
        const {metadata, metadataURI} = await this.getMetadata(tokenId);
        const nft = await this.getNFT(tokenId);
        console.log(`Pinning token id ${tokenId}...`);
        const pinned = await nft.pin();
        console.log(`Pinned token id ${tokenId}.`);
        return pinned;
    }

    async unpin(tokenId) {
        const {metadata, metadataURI} = await this.getMetadata(tokenId);
        const nft = await this.getNFT(tokenId);
        console.log(`Unpinning token id ${tokenId}...`);
        const unpinned = await nft.unpin();
        console.log(`Unpinned token id ${tokenId}.`);
        return unpinned;
    }

}















function parseTokenId(receipt) {
    // console.log(receipt);

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