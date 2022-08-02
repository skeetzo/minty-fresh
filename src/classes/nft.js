const Ajv = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const config = require('getconfig');
const fs = require('fs');
// const fs = require('fs/promises');

const { promptSchema, promptAdditionalProperties, promptAdditionalAttributes, promptForMissing } = require('./prompt.js');

// TODO
// or update to a method that fetches the project root better
const SCHEMA_PATH = "../../config/schemas";

// ipfs.add parameters for more deterministic CIDs
const ipfsAddOptions = {
  cidVersion: 1,
  hashAlg: 'sha2-256'
};

const ERC20_interfaceId = "0x36372b07",
      ERC721_interfaceId = "0x80ac58cd";

class NFT {

    constructor(opts) {

        this.assets = opts.assets || config.default_assetObjects || {};
        this.contract = opts.contract || null; // contract name
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
            this.schemaJSON = await IPFS.loadSchema(this.schema);
        else
            this.schemaJSON = await NFT.loadSchema(this.schema);

        this.metadata = await NFT.fromSchema(this.schemaJSON);

        this._initialized = true;
    }

    // TODO
    // act as enum?
    // or interface with contract.methods.supportsInterface or whatever the function is
    static getStandard() {}

    // TODO
    // create NFT from metadata {} object possibly with schema name
    static fromMetadata(metadata, options={}) {return {}}

    // TODO
    // return object from schema
    static fromSchema(schema, options={}) {return {}}

    // TODO
    // load schema from ipfs
    async loadSchemaIPFS(cidOrURI) {}

    // locally from files
    static loadSchema(schema) {
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

    // validate according to its schema
    static validate(metadata, schema) {
        // replace empty values with null for flagging validation
        for (const [key, value] of Object.entries(metadata))
            if (value === "") metadata[key] = null;
        const validate = ajv.compile(schema);
        const valid = validate(metadata);
        if (!valid) {
            console.error(validate.errors);
            throw "Error: unable to validate data";
        }
        return metadata;
    }

}

module.exports = NFT;







//     if (templates.length==1) return _parseTemplate(templates[0]);
//     // prompt for templates
//     const question = {
//         'type': "rawlist",
//         'name': "question",
//         'message': "Select an NFT template:",
//         'default': defaultIndex,
//         'choices': templates
//     }
//     const template = (await inquirer.prompt(question))["question"];
//     return _parseTemplate(template);
// }