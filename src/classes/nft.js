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
const Asset = require('./asset.js');
const IPFS = require('./ipfs.js');

// const ERC20_interfaceId = "0x36372b07",
      // ERC721_interfaceId = "0x80ac58cd";

class NFT {

    constructor(opts) {

        this.name = opts.name || null;
        this.assets = opts.assets || [];
        this.metadata = opts.metadata || {};
        this.schema = opts.schema || "default";
        this.schemaJSON = {};
        this.tokenId = opts.tokenId ? parseInt(opts.tokenId) : null;
        this.owner = opts.owner || null;

        this.metadataCID = opts.metadataCID || null;
        this.metadataURI = opts.metadataURI || null;

        // is there a need for tracking ERC token standard? perhaps check at function call when doing specific checks?
        this.standard = opts.standard || 0;

        this._initialized = false;
    }

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
    
        if (process.env.cli)
            this.schemaJSON = await promptSchema(this.schema);
        else if (this.schema.includes("ipfs"))
            this.schemaJSON = await NFT.loadSchemaFromIPFS(this.schema);
        else
            this.schemaJSON = await NFT.loadSchemaFromFile(this.schema);

        this.metadata = NFT.fromSchema(this.schemaJSON);

        this._initialized = true;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    // TODO
    // act as enum?
    // or interface with contract.methods.supportsInterface or whatever the function is
    // static getStandard() {}

    // TODO
    // create NFT from metadata {} object possibly with schema name
    // static fromMetadata(metadata) {return {}}

    // TODO
    // load directly from metadata at ipfs
    static fromIPFS() {}

    // TODO
    // return object from schema
    static fromSchema(schema) {return JSONschemaDefaults(schema)}

    // return schema as an IPFS cid if available
    static _getSchemaCID(schema) {
        for (const [key, value] in config.schemasIPFS)
            if (key == schema) return config.schemasIPFS[key];
        return null;
    }

    // TODO
    // return config.schemasIPFS if available
    static _getSchemasCID() {
        return config.schemasIPFS || null;
    }

    // TODO
    // load schema from ipfs
    static async loadSchemaFromIPFS(schema) {
        let cid = NFT._getSchemaCID(schema);
        // if (!cid) cid = NFT._getSchemasCID();
        return null;

    }

    // locally from files
    static loadSchemaFromFile(schema) {
        console.debug(`loading schema: ${schema}...`);
        function _parseTemplate(t) {return JSON.parse(fs.readFileSync(`${config.SCHEMA_PATH}/${t}.json`))}
        // get list of template files from available files in available /schema directories
        const templates = [];
        const localPath = path.join(__dirname, "../..", config.SCHEMA_PATH), // path local to this script
              addonPath = path.join(process.env.PWD, config.SCHEMA_PATH);// path to where the cwd is
        const files = [];
        if (fileExists(localPath)) 
            files.push(...fs.readdirSync(localPath));
        if (addonPath != localPath && fileExists(addonPath))
            files.push(...fs.readdirSync(addonPath));
        let defaultIndex = 0;
        for (let i=0;i<files.length;i++) {
            const filename = files[i].replace(".json","");
            if (filename === schema) return _parseTemplate(filename);
            templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
            // set simple.json to default template
            if (filename === "simple") defaultIndex = i;
        }
        return _parseTemplate(templates[defaultIndex]);
    }

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
        for (const [key, filePathOrCID] of Object.entries(this.getAssets())) {
            console.debug(`Pinning ${key} data for token id ${this.tokenId}....`);
            await IPFS.pin(filePathOrCID);
            assetURIs.push(filePathOrCID);
        }
        console.debug(`Pinning metadata for token id ${this.tokenId}...`);
        await IPFS.pin(this.metadataURI);
        return {assetURIs, metadataURI: this.metadataURI};
    }

    // is this even possible?
    async unpin() {}

    async upload() {
        if (!this._initialized) await this.init();
        this.validate();
        await Asset.uploadAssets(this.metadata);
        await this.uploadMetadata();
    }

    // upload to ipfs
    async uploadMetadata() {
        const file = { 
            name: `${this.metadata.name}.json`,
            path: `/metadata/${this.metadata.name}.json`,
            content: JSON.stringify(this.metadata)
        };
        const { metadataCID, metadataURI } = await IPFS.add(file);
        this.metadataCID = metadataCID;
        this.metadataURI = metadataURI;
    }

    // validate according to its schema
    validate() {
        console.debug(`validating NFT schema: ${this.schema}...`);
        // replace empty values with null for flagging validation
        for (const [key, value] of Object.entries(this.metadata))
            if (value === "") this.metadata[key] = null;
        const validate = ajv.compile(this.schemaJSON);
        const valid = validate(this.metadata);
        if (!valid) {
            console.error(validate.errors);
            throw "Error: unable to validate data";
        }
        console.debug("valid JSON!");
    }

}

module.exports = NFT;


async function parseErrors(validationErrors) {
    let errors = [];
    validationErrors.forEach(error => {
      errors.push({
        param: error.params["missingProperty"],
        key: error.keyword,
        message: error.message,
        property: (function() {
          return error.keyword === 'minimum' ? error.dataPath : undefined
        })() 
      });
    });

    return errors;
}

