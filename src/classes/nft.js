const Ajv = require("ajv");
const { ErrorObject } = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const config = require('getconfig');
const fs = require('fs');
const fs_ = require('fs/promises');
const path = require('path');
const JSONschemaDefaults = require('json-schema-defaults');

const { fileExists } = require('../utils/helpers.js');
const { promptSchema } = require('../utils/prompt.js');
const IPFS = require('./ipfs.js');
const Schema = require('./schema.js');

// const ERC20_interfaceId = "0x36372b07",
      // ERC721_interfaceId = "0x80ac58cd";

class NFT {

    constructor(opts={}) {
        this.schema = opts.schema || "default";

        this.name = opts.name || null;
        this.symbol = opts.symbol || null;

        this.metadata = opts.metadata || {};
        
        this.tokenId = opts.tokenId ? parseInt(opts.tokenId) : null;
        this.owner = opts.owner || null;

        this.metadataCID = opts.metadataCID || null;
        this.metadataURI = opts.metadataURI || null;

        this._initialized = false;
    }

    toString() {
        return {
            name: this.name,
            symbol: this.symbol,
            schema: this.schema, 
            properties: this.properties,
            attributes: this.attributes,
            metadata: this.metadata,
            metadataCID: this.metadataCID,
            metadataURI: this.metadataURI,
            tokenId: this.tokenId ? parseInt(this.tokenId) : this.tokenId,
            owner: this.owner
        }
    }

    async init() {
        if (this._initialized) return;
    
        // populate metadata if empty
        if (Object.keys(this.metadata).length === 0) {
            if (process.env.cli)
                this.metadata = await promptSchema(this.schema);
            else
                this.metadata = Schema.parse(await Schema.load(this.schema));
        }

        this._initialized = true;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // get property in metadata matching prop
    getProperty(prop="image") {}

    // get all properties in metadata for the matching schema
    getProperties() {
        // load json schema from file
        // return all the object keys from .properties
    }

    // get attribute in metadata matching attr
    getAttribute(attr="name") {}

    // get all attributes in metadata for the matching schema
    getAttributes() {
        // return all the attributes in metadata
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} tokenId - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pin() {
        if (this.tokenId === null) throw new Error("missing token id");
        if (this.metadataURI === null) await this.upload();
        const assetURIs = [];
        // pin each asset first
        for (const [key, filePathOrCID] of Object.entries(this.getProperties())) {
            console.debug(`pinning ${key} data for token id ${this.tokenId}....`);
            await IPFS.pin(filePathOrCID);
            assetURIs.push(filePathOrCID);
        }
        console.debug(`pinning metadata for token id ${this.tokenId}...`);
        await IPFS.pin(this.metadataURI);
        return {assetURIs, metadataURI: this.metadataURI};
    }

    async unpin() {
        if (this.tokenId === null) throw new Error("missing token id");
        if (this.metadataURI === null) throw new Error("missing token uri");
        // unpin each asset first
        for (const [key, filePathOrCID] of Object.entries(this.getProperties())) {
            console.debug(`unpinning ${key} data for token id ${this.tokenId}....`);
            await IPFS.unpin(filePathOrCID);
        }    
        console.debug(`unpinning metadata for token id ${this.tokenId}...`);
        await IPFS.unpin(this.metadataURI);
    }

    async upload() {
        if (!this._initialized) await this.init();
        Schema.validate(this.schema, this.metadata);
        await this._uploadAttributes();
        await this._uploadProperties();
        await this._uploadMetadata();
    }

    // upload to ipfs
    async _uploadMetadata() {
        console.debug("uploading metadata...");
        const file = { 
            name: `${this.metadata.name}.json`,
            path: `/metadata/${this.metadata.name}.json`,
            content: JSON.stringify(this.metadata)
        };
        const { metadataCID, metadataURI } = await IPFS.add(file);
        this.metadataCID = metadataCID;
        this.metadataURI = metadataURI;
    }

    async _uploadProperties() {
        // upload each property in metadata
        // replace local files with uploaded CID


        console.debug("uploading metadata properties...");
        // TODO: this for loop needs to be updated to loop object keys in .metadata
        for (const prop of this.metadata.properties) {
            const { metadataCID, metadataURI } = await this._uploadProperty(prop);
            this.metadata[prop.name] = metadataCID;
        }
    }

    async _uploadProperty(prop) {
        // check if property is a local file or a CID
        // if local, upload property and return CID
        // if CID, return CID




        if (!fileExists(prop.path)) throw "incorrect property path";
        console.debug("uploading property: ", prop.name);
        const file = { 
            name: path.basename(prop.path).replace(/\/[^a-z0-9\s]\//gi, '_'),
            path: `/${prop.name}s/${path.basename(prop.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
            content: await fs_.readFile(prop.path)
        };
        const { metadataCID, metadataURI } = await IPFS.add(file);
        return { metadataCID, metadataURI };
    }

    async _uploadAttributes() {
        // upload each attribute in metadata
        // replace local files with uploaded CID
        
    }
    async _uploadAttribute(attr) {}

}

module.exports = NFT;
