const Ajv = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const config = require('getconfig');
const fs = require('fs');
// const fs = require('fs/promises');

const { promptSchema, promptAdditionalProperties, promptAdditionalAttributes, promptForMissing } = require('./prompt.js');

const SCHEMA_PATH = "./config/schemas";

// ipfs.add parameters for more deterministic CIDs
const ipfsAddOptions = {
  cidVersion: 1,
  hashAlg: 'sha2-256'
};

class NFT {

    constructor(opts) {

        this.assets = opts.assets || config.default_assetObjects || {};
        this.contract = opts.contract || null; // contract name
        this.metadata = opts.metadata || {};
        this.schema = opts.schema || "default";

        this._initialized = false;
    }

    async init() {
        if (this._initialized) {
            return;
        }

        this.schema = await this.createSchema();
        this.metadata = await this.createMetadata();

    }

    // TODO
    async createMetadata(schema, options) {
        return {}
    }

    async createSchema() {
        if (process.env.PROMPT) return await promptSchema();
        else if (this.schema.includes("ipfs")) return this.loadSchema();
        else return this.loadSchema();
    }

    // locally from files
    loadSchema() {
        function _parseTemplate(t) {return JSON.parse(fs.readFileSync(`${SCHEMA_PATH}/${t}.json`))}
        // get list of template files from available files in available /schema directories
        const templates = [];
        const localPath = path.join(__dirname, "../", SCHEMA_PATH), // path local to this script
              addonPath = path.join(process.env.PWD, SCHEMA_PATH);// path to where the cwd is
        const files = [];
        if (fileExists(localPath)) files.extend(fs.readdirSync(localPath));
        if (addonPath != localPath && fileExists(addonPath)) files.extend(fs.readdirSync(addonPath));
        for (const schemaPath of schemas)
            files.extend(fs.readdirSync(schemaPath))
        let defaultIndex = 0;
        for (let i=0;i<files.length;i++) {
            const filename = files[i].replace(".json","");
            if (filename === this.schema) return _parseTemplate(filename);
            templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
            // set simple.json to default template
            if (filename === "simple") defaultIndex = i;
        }
        return _parseTemplate(templates[defaultIndex]);
    }

    // TODO
    // from IPFS
    async fetchSchema() {}

    // TODO
    // possibly add type from schema into message for entering inputs
    async promptMetadata(options) {
        const schema = await selectSchema(options.schema);
        // determine metadata base
        const metadata = await this.createMetadata(options.schema, options);
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

    // upload the metadata itself
        // does not upload assets
    async upload(options) {

        if (this.assets)
            await this.uploadAssets();


    }

    async uploadMetadata() {
        // add the metadata to IPFS
        const { cid: metadataCid } = await IPFS.add({ path: `/${this.contract}/nfts/metadata/${this.metadata.name}.json`, content: JSON.stringify(this.metadata)}, IPFS.ipfsAddOptions);
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
        return this.metadata;
    }




        // TODO
    // add interaction to fetch stored schemas from IPFS
    // select schema from IPFS
    // possibly in a folder of .json schemas
    async selectSchemaFromIPFS() {}
    // fetch schema json file from IPFS
    async fetchSchema(cid) {}

    async fetchMetadata(cid) {}

}

module.exports = NFT;







    if (templates.length==1) return _parseTemplate(templates[0]);
    // prompt for templates
    const question = {
        'type': "rawlist",
        'name': "question",
        'message': "Select an NFT template:",
        'default': defaultIndex,
        'choices': templates
    }
    const template = (await inquirer.prompt(question))["question"];
    return _parseTemplate(template);
}