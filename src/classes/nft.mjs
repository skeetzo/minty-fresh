
import { Asset } from './asset.mjs';
import { IPFS } from './ipfs.mjs';

import { readMetadata, writeMetadata } from "../utils/exiftool.js";
import { promptSchema, promptMetadata } from '../utils/prompt.mjs';
import { fromSchema, loadSchemaFromFile, loadTemplates, validate } from '../utils/schema.mjs';

// const ERC20_interfaceId = "0x36372b07",
      // ERC721_interfaceId = "0x80ac58cd";

export class NFT {

    constructor(opts) {

        this.name = opts.name || null;
        this.assets = opts.assets || [];
        this.metadata = opts.metadata || {};
        this.schema = opts.schema || "default";
        this.schemaJSON = {};
        this.tokenId = parseInt(opts.tokenId);
        this.owner = opts.owner || null;
        this.encrypt = opts.encrypt || false;

        this.metadataCID = opts.metadataCID || null;
        this.metadataURI = opts.metadataURI || null;

        // is there a need for tracking ERC token standard? perhaps check at function call when doing specific checks?
        this.standard = opts.standard || 0;

        // TODO: cleanup how this is implemented
        this.base_uri = opts.base_uri || "ipfs://";
        this.skipAttributes = opts.skipAttributes || false;
        this.skipProperties = opts.skipProperties || false;

        this._initialized = false;
    }

    toJSON() {
        return {
            name: this.name,
            schema: this.schema,
            // TODO: add a toString for Assets or do something here with it better
            assets: this.assets,
            metadata: this.metadata,
            metadataCID: this.metadataCID,
            metadataURI: this.metadataURI,
            tokenId: this.tokenId ? parseInt(this.tokenId) : this.tokenId,
            owner: this.owner,
            standard: parseInt(this.standard)
        }
    }

    // for backwards compatability until its removed
    toString() {
        return {
            name: this.name,
            schema: this.schema,
            // TODO: add a toString for Assets or do something here with it better
            assets: this.assets,
            metadata: this.metadata,
            metadataCID: this.metadataCID,
            metadataURI: this.metadataURI,
            tokenId: this.tokenId ? parseInt(this.tokenId) : this.tokenId,
            owner: this.owner,
            standard: parseInt(this.standard)
        }
    }

    async init() {
        if (this._initialized) {
            return;
        }

        // TODO: figure out the proper sequence to accomplish the behavior:
        // - create a default object from the schema
        // - copy all the provided metadata values to the default schema
        // - if cli, prompt to fill in missing values

        if (process.env.cli) {
            if (!this.schema)
                this.schema = await promptSchema(loadTemplates());

            // this.metadata is updated by the prompt function
            const { metadata, schemaJSON } = await promptMetadata(this.metadata, this.schema, {"skipAttributes":this.skipAttributes,"skipProperties":this.skipProperties});
            this.metadata = metadata;
            this.schemaJSON = schemaJSON;
        }
        else {
            this.schemaJSON = await loadSchemaFromFile(this.schema);
            this.metadata = {...this.metadata, ...fromSchema(this.schemaJSON)}
        }

        // console.log("schemaJSON:", this.schemaJSON);
        // console.debug("metadata:", this.metadata);

        this._initialized = true;
    }

    // static async createFromFile(filePath, schema) {
    //     const nft = new NFT({schema});
    //     await nft.readMetadataFromFile(filePath);
    //     await nft.init();
    //     return nft;
    // }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO
    // act as enum?
    // or interface with contract.methods.supportsInterface or whatever the function is
    // static getStandard() {}

    // return schema as an IPFS cid if available
    // static _getSchemaCID(schema) {
    //     for (const [key, value] in config.schemasIPFS)
    //         if (key == schema) return config.schemasIPFS[key];
    //     return null;
    // }

    // // TODO
    // // return config.schemasIPFS if available
    // static _getSchemasCID() {
    //     return config.schemasIPFS || null;
    // }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    getAsset(asset="image") {
        return Asset.getAsset(this.metadata, asset);
    }

    // this will return Asset classes
    getAssets() {
        return Asset.getAssets(this.metadata, this.schema);
    }

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} tokenId - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pin() {
        if (this.tokenId === null) throw "missing token id";
        if (this.metadataURI === null) await this.upload();
        const assetURIs = [];
        // pin each asset first
        for (const asset of this.getAssets()) {
            console.debug(`Pinning ${asset.name} data for token id ${this.tokenId}....`);
            await IPFS.pin(asset.cid);
            assetURIs.push(asset.uri);
        }
        console.debug(`Pinning metadata for token id ${this.tokenId}...`);
        await IPFS.pin(this.metadataURI);
        return {assetURIs, metadataURI: this.metadataURI};
    }

    // is this even possible?
    async unpin() {}

    async upload() {
        if (!this._initialized) await this.init();

        // upload all asset objects
        await this.uploadAssets();

        // upload each asset detected in metadata
        await Asset.uploadAssets(this.metadata, this.schema, this.encrypt);

        validate(this.metadata, this.schema, this.schemaJSON);
        
        // upload the final metadata containing each uploaded assets' cids
        await this.uploadMetadata();
    }

    async uploadAssets() {
        for (const asset of this.assets) {
            const { metadataCID, metadataURI, key } = await asset.upload();
            this.metadata["key"] = key;
            // TODO: do something with this?
        }
    }

    // upload to ipfs
    async uploadMetadata() {
        const file = { 
            name: `${this.name}.json`,
            // path: `/metadata/${this.name}.json`,
            path: `/${this.name}.json`,
            content: JSON.stringify(this.metadata)
        };
        const { metadataCID, metadataURI } = await IPFS.add(file, this.base_uri);
        this.metadataCID = metadataCID;
        this.metadataURI = metadataURI;
    }

    async writeMetadataToFile(filePath) {
        await writeMetadata(filePath, this.metadata)
    }


    async readMetadataFromFile(filePath) {
        this.metadata = await readMetadata(filePath);
    }

}

// async function parseErrors(validationErrors) {
//     let errors = [];
//     validationErrors.forEach(error => {
//       errors.push({
//         param: error.params["missingProperty"],
//         key: error.keyword,
//         message: error.message,
//         property: (function() {
//           return error.keyword === 'minimum' ? error.dataPath : undefined
//         })() 
//       });
//     });
//     return errors;
// }

