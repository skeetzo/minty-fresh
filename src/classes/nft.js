import { Ajv, ErrorObject } from "ajv";
import * as config from 'getconfig';
import * as fs from "fs";
import * as fs_  from "fs/promises";
import 'path';
import * as JSONschemaDefaults from 'json-schema-defaults';

import { fileExists, getContractForNetwork } from '../utils/helpers';
import { promptSchema } from '../utils/prompt';
import IPFS from './ipfs';
import { loadSchema, parseSchema, validateSchema } from './schema';

// const ERC20_interfaceId = "0x36372b07",
      // ERC721_interfaceId = "0x80ac58cd";

const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

export default class NFT {

    // Required: name, network
    constructor(opts={}) {
        this.schema = opts.schema || "default";
        this.metadata = opts.metadata || {};
        this.metadataCID = opts.metadataCID || null;
        this.metadataURI = opts.metadataURI || null;

        this.name = opts.name || null;
        this.symbol = opts.symbol || null;

        this.network = opts.network || null; // contract network
        this.address = opts.address ? opts.address : getContractForNetwork(this.name, this.network);
        
        this.owner = opts.owner || null; // the owner of this NFT
        this.id = opts.id ? parseInt(opts.id) : null;

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
            id: this.id ? parseInt(this.id) : this.id,
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
    getProperty(prop="image") {
        if (this.metadata.hasOwnProperty(prop)) return this.metadata[prop];
        throw new Error("missing property - "+prop);
    }

    // get all properties for known schema
    getProperties() {
        // load json schema from file
        const json = Schema.loadSchema(this.schema);
        // return all the object keys from .properties
        const props = Object.keys(json.properties);
        // return all the keys in metadata that match properties
        return Object.fromEntries(Object.entries(obj).filter(([key]) => props.includes(key)));
    }

    // get attribute in metadata matching attr name
    getAttribute(attr="name") {
        for (const attribute in this.metadata.attributes)
            if (attribute.hasOwnProperty("name") && attribute.name === attr) return attribute;
        throw new Error("missing attribute - "+attr);
    }

    // get all attributes in metadata for the matching schema
    getAttributes(sort=false) {
        if (!this.metadata) throw new Error("missing metadata");
        if (!this.metadata.attributes) throw new Error("missing attributes");
        if (sort) return this.metadata.attributes.sort((a,b) => a.name - b.name); // b - a for reverse sort
        return this.metadata.attributes;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    async _deleteMetadata() {}
    async _deleteProperties() {}
    async _deleteAttributes() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} id - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pin() {
        if (this.id === null) throw new Error("missing token id");
        if (this.metadataURI === null) await this.upload();
        const assetURIs = [];
        // pin each asset first
        for (const [key, filePathOrCID] of Object.entries(this.getProperties())) {
            console.debug(`pinning ${key} data for token id ${this.id}....`);
            await IPFS.pin(filePathOrCID);
            assetURIs.push(filePathOrCID);
        }
        console.debug(`pinning metadata for token id ${this.id}...`);
        await IPFS.pin(this.metadataURI);
        return {assetURIs, metadataURI: this.metadataURI};
    }

    async unpin() {
        if (this.id === null) throw new Error("missing token id");
        if (this.metadataURI === null) throw new Error("missing token uri");
        // unpin each asset first
        for (const [key, filePathOrCID] of Object.entries(this.getProperties())) {
            console.debug(`unpinning ${key} data for token id ${this.id}....`);
            await IPFS.unpin(filePathOrCID);
        }    
        console.debug(`unpinning metadata for token id ${this.id}...`);
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
