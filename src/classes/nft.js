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

// const ERC20_interfaceId = "0x36372b07",
      // ERC721_interfaceId = "0x80ac58cd";

class NFT {

    constructor(opts) {

        this.ipfs = opts.ipfs || null;
        this.name = opts.name || null;
        this.assets = opts.assets || {};
        this.metadata = opts.metadata || {};
        this.schema = opts.schema || "default";
        this.schemaJSON = {};
        this.tokenId = opts.tokenId || null;

        this.metadataCID = opts.metadataCID || null;
        this.metadataURI = opts.metadataURI || null;

        // is there a need for tracking ERC token standard? perhaps check at function call when doing specific checks?
        this.standard = opts.standard || 0;

        this._initialized = false;
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

    // retrieves [key, value] pairs from {} metadata matched to known schemas or default
    getAssets() {
        if (Object.keys(this.assets).length > 0) return this.assets;
        const assets = {},
              assetTypes = config.assetTypes || {};
        for (const key of assetTypes)
            for (const [_key, value] of Object.entries(this.metadata))
                if (key == _key)
                    assets[key] = value;
        this.assets = assets;
        return assets;
    }

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} tokenId - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pin() {
        if (!this.tokenId) throw "missing token id";
        if (!this.metadataURI) await this.upload();
        const assetURIs = [];
        // pin each asset first
        for (const [key, value] of this.assets) {
            console.log(`Pinning asset data (${key}) for token id ${this.tokenId}....`);
            await this.ipfs.pin(this.metadata[key]);
            assetURIs.push(this.metadata[key]);
        }
        console.log(`Pinning metadata (${this.metadataURI}) for token id ${this.tokenId}...`);
        await this.ipfs.pin(this.metadataURI);
        return {assetURIs, metadataURI: this.metadataURI};
    }

    // is this even possible?
    async unpin() {}

    async upload() {
        if (!this._initialized) await this.init();
        this.validate();
        await this.uploadAssets();
        await this.uploadMetadata();
    }

    // upload to ipfs
    async uploadMetadata() {
        const ipfsPath = `/${this.name}/nfts/metadata/${this.metadata.name}.json`;
        const { metadataCID, metadataURI } = await this.ipfs.add(ipfsPath, JSON.stringify(this.metadata));
        this.metadataCID = metadataCID;
        this.metadataURI = metadataURI;
    }

    // upload asset to folder name
    async uploadAsset(filePath, folderName="assets") {
        if (!fileExists(filePath)) throw "incorrect asset path";
        // add the asset to IPFS
        // const filePath = options.path || 'asset.bin';
        const basename =  path.basename(filePath);
        const content = await fs_.readFile(filePath);
        // When you add an object to IPFS with a directory prefix in its path,
        // IPFS will create a directory structure for you. This is nice, because
        // it gives us URIs with descriptive filenames in them e.g.
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
        // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
        const ipfsPath = `/${this.name}/nfts/${folderName}/${basename}`;
        const { metadataCID: assetCID, metadataURI: assetURI } = await this.ipfs.add(ipfsPath, content);
        // const assetURI = IPFS.ensureIpfsUriPrefix(assetCID) + '/' + basename;        
        return { assetCID, assetURI };
    }

    // should get all assets key/value pairs in this.assets
    // and check if the value is data or a CID
    // if its data, upload it and replace it's value with its uploaded CID
    async uploadAssets() {
        const assets = {};
        for (const [key, filePathOrCID] of Object.entries(this.getAssets())) {
            if (IPFS.validateCIDString(filePathOrCID)) continue; // must not already be a CID string
            const {assetCID, assetURI} = await this.uploadAsset(filePathOrCID, `assets/${key}`);
            this.metadata[key] = assetCID;
            assets[key] = {};
            assets[key].cid = assetCID;
            assets[key].uri = assetURI;
        }
        this.assets = assets;
    }

    // validate according to its schema
    validate() {
        // replace empty values with null for flagging validation
        for (const [key, value] of Object.entries(this.metadata))
            if (value === "") this.metadata[key] = null;
        const validate = ajv.compile(this.schemaJSON);
        const valid = validate(this.metadata);
        if (!valid) {
            console.error(validate.errors);
            throw "Error: unable to validate data";
        }
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

