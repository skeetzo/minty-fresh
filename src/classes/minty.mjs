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
export default class Minty {
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

        // initialize token from provided token options
        const { token } = this.token instanceof NFT ? this.token : new NFT(this.token);
        this.token = token;

        const { account, network, signer } = await _initializeEthers(this.host)
        this.account = account;
        this.network = network.name;
        this.signer = signer;

        // load abi and any available contract json
        const { abi, bytecode, contractJSON } = this._loadABI(account, network, token); 

        // initialize contract 
        const { address } = await _initializeContract(abi, bytecode, contractJSON)
        this.address = address;

        if (!address && !abi) throw new Error("unable to connect to contract!");

        console.debug("connecting to contract...");
        this.contract = await new ethers.Contract(address, abi, signer);

        console.debug("initialized Minty!");
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
            return await deployContract(abi, bytecode);
        }
        return { address: "Unknown Address" }
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
            // TODO
            // get abi from etherscan, etc
        }
        if (!abi) throw new Error("unable to find ABI for contract!");
        return { abi, bytecode, contractJSON };
    }

    async deployContract(abi, bytecode) {
        const contractName = this.token.name || "Unknown Contract";
        try {
            console.log(`Deploying ${contractName} to ${this.network}`);
            // const iface = new ethers.utils.Interface(abi);
            const factory = new ethers.ContractFactory(abi, bytecode, this.signer);
            const contract = await factory.deploy(this.token.name, this.token.symbol);
            await contract.deployTransaction.wait();
            return { address: contract.address };
        }
        catch (err) {
            console.error(err);
            console.warn("Unable to deploy contract!");
        }
        return { address: null }
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
    // finish return value of cli output
    static async mintNFT(options) {
        options.skipMint ? console.debug(`practicing token mint...`) : console.debug(`minting token...`);
        const minty = await MakeMinty(options);
        const nft = new NFT({...options, ...this});
        await nft.upload(); // ensure metadata is uploaded
        // get the address of the token owner from options, or use the default signing address if no owner is given
        if (!options.skipMint) {
            if (!nft.owner) nft.owner = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
            nft.tokenId = await nft.mint(nft.owner, nft.metadataURI);
            console.debug(`pretend token: `);
        }
        else 
            console.debug(`minted token: `);
        console.debug(nft.toString());
        return nft;
    }

    static async mintNFTs(options) {
        options.skipMint ? console.debug(`practicing token batch mint...`) : console.debug(`batch minting tokens...`);
        const minty = await MakeMinty(options);
        const nft = new NFT({...options, ...this});
        await nft.upload(); // ensure metadata is uploaded
        // get the address of the token owner from options, or use the default signing address if no owner is given
        if (!options.skipMint) {
            if (!nft.owner) nft.owner = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
            // only works with "standard" minting behavior
            nft.tokenId = await nft.mint(nft.owner, nft.metadataURI);
            console.debug(`pretend token: `);
        }
        else 
            console.debug(`minted token: `);
        console.debug(nft.toString());
        return nft;
    }

    // updates an ipns nft's metadata
    static async updateNFT(tokenId, options, updates) {
        options.skipMint ? console.debug(`practicing token update...`) : console.debug(`updating token...`);
        const minty = await MakeMinty(options);
        const nft = new NFT({...options, ...this});
        // await nft.upload(); // ensure metadata is uploaded
        // get the address of the token owner from options, or use the default signing address if no owner is given
        if (!options.skipMint) {
            if (!nft.owner) nft.owner = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
            // only works with "standard" minting behavior
            // TODO
            // await nft.update(updates);
            console.debug(`pretend token: `);
        }
        else 
            console.debug(`minted token: `);
        console.debug(nft.toString());
        return nft;
    }

    static async burnNFT(tokenId, options) {
        options.skipMint ? console.debug(`practicing token burn...`) : console.debug(`burning token...`);
        const minty = await MakeMinty(options);
        const nft = new NFT({...options, ...this});
        await nft.upload(); // ensure metadata is uploaded
        // get the address of the token owner from options, or use the default signing address if no owner is given
        if (!options.skipMint) {
            if (!nft.owner) nft.owner = await this.defaultRecipientAddress() || await this.defaultOwnerAddress();
            await nft.burn();
            console.debug(`pretend token: `);
        }
        else 
            console.debug(`minted token: `);
        console.debug(nft.toString());
        return nft;
    }

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
            return { metadata, metadataURI };
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