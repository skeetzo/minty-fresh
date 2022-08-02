const Ajv = require("ajv");
const { ErrorObject } = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const config = require('getconfig');
const fs = require('fs');
// const fs = require('fs/promises');

const JSONschemaDefaults = require('json-schema-defaults');

const { promptSchema, promptAdditionalProperties, promptAdditionalAttributes, promptForMissing } = require('./prompt.js');
const { IPFS } = require('./ipfs.js');

const ERC20_interfaceId = "0x36372b07",
      ERC721_interfaceId = "0x80ac58cd";

class NFT {

    constructor(opts) {

        this.ipfs = opts.ipfs || null;
        this.contract = opts.contract || null;
        this.assets = opts.assets || config.default_assetObjects || {};
        this.metadata = opts.metadata || {};
        this.schema = opts.schema || "default";
        this.tokenId = opts.tokenId || null;

        this.metadataCid = opts.cid || null;
        this.metadataURI = opts.uri || null;

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

    // TODO
    // act as enum?
    // or interface with contract.methods.supportsInterface or whatever the function is
    // static getStandard() {}

    // TODO
    // create NFT from metadata {} object possibly with schema name
    // static fromMetadata(metadata) {return {}}

    // TODO
    // return object from schema
    static fromSchema(schema) {return JSONschemaDefaults(this.schema)}

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
        const localPath = path.join(__dirname, "../", config.SCHEMA_PATH), // path local to this script
              addonPath = path.join(process.env.PWD, config.SCHEMA_PATH);// path to where the cwd is
        const files = [];
        if (fileExists(localPath)) files.extend(fs.readdirSync(localPath));
        if (addonPath != localPath && fileExists(addonPath)) files.extend(fs.readdirSync(addonPath));
        for (const schemaPath of schemas)
            files.extend(fs.readdirSync(schemaPath))
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

    // TODO
    // possibly add type from schema into message for entering inputs
    async promptMetadata(options) {
        const schema = await selectSchema(options.schema);
        // determine metadata base
        const metadata = await NFT.fromSchema(options.schema, options);
        const questions = [];
        if (schema.hasOwnProperty("properties"))
            for (const [key, value] of Object.entries(schema.properties))
                questions.push({
                    'type': 'input',
                    'name': key,
                    'message': `${value["description"]}: ${key} =`
                });
        // prompt for missing details if not provided as cli args
        await promptForMissing(options, questions);    
        // prompt to add additional properties & attributes
        await promptAdditionalProperties(metadata);
        if (schema.hasOwnProperty("attributes") || Object.keys(schema).length == 0) // or if schema is 'blank'
            await promptAdditionalAttributes(metadata);
        return {
            schema: schema,
            metadata: metadata
        }
    }

    //////////////////////////////////////////

    /**
     * Pins all IPFS data associated with the given tokend id to the remote pinning service.
     * 
     * @param {string} tokenId - the ID of an NFT that was previously minted.
     * @returns {Promise<{assetURI: string, metadataURI: string}>} - the IPFS asset and metadata uris that were pinned.
     * Fails if no token with the given id exists, or if pinning fails.
     */
    async pin() {
        if (!this.metadataURI) await this.upload();
        const assetURIs = [];
        for (const [key, value] of this.assets) {
            console.log(`Pinning asset data (${key}) for token id ${tokenId}....`);
            await this.ipfs.pin(this.metadata[key]);
            assetURIs.push(this.metadata[key]);
        }
        console.log(`Pinning metadata (${this.metadataURI}) for token id ${tokenId}...`);
        await this.ipfs.pin(this.metadataURI);
        return {assetURIs, this.metadataURI};
    }

    // TODO
    // retrieves [key, value] pairs from {} metadata
    getAssets() {}

    // TODO
    // finish / check process
    async upload() {
        if (!this._initialized) await this.init();
        this.validate();
        await this.uploadAssets();
        const { metadataCid, metadataURI }  = await this.uploadMetadata();
        this.metadataCid = metadataCid;
        this.metadataURI = metadataURI;
        return {
            metadataCid,
            metadataURI
        };
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

    // TODO
    // make sure this function works with this.upload()
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

    // validate according to its schema
    validate() {
        // replace empty values with null for flagging validation
        for (const [key, value] of Object.entries(this.metadata))
            if (value === "") this.metadata[key] = null;
        const validate = ajv.compile(this.schema);
        const valid = validate(this.metadata);
        if (!valid) {
            console.error(validate.errors);
            throw "Error: unable to validate data";
        }
    }


}

module.exports = NFT;


async function parseErrors(validationErrors: ErrorObject[]) {
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

