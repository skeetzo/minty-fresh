
const SCHEMA_PATH = "./schemas";

// TODO
// add interaction to fetch stored schemas from IPFS

async function selectSchemaIPFS() {
    // select schema from IPFS
    // possibly in a folder of .json schemas
}

async function fetchSchema(cid) {
    // fetch schema json file from IPFS
}

async function fetchIPFSSchema() {
    // fetch schema json folder from IPFS
}

async function selectSchema(defaultTemplate=null) {
    function _parseTemplate(t) {return JSON.parse(fs.readFileSync(`${SCHEMA_PATH}/${t}.json`))}
    // get list of template files from available files in available /schema directories
    const templates = [];
    const localPath = path.join(__dirname, "../", SCHEMA_PATH), // path local to this script
          addonPath = path.join(process.env.PWD, SCHEMA_PATH);// path to where the cwd is
    const files = [];
    if (await fileExists(localPath)) files.extend(fs.readdirSync(localPath));
    if (addonPath != localPath && await fileExists(addonPath)) files.extend(fs.readdirSync(addonPath));
    for (const schemaPath of schemas)
        files.extend(fs.readdirSync(schemaPath))
    let defaultIndex = 0;
    for (let i=0;i<files.length;i++) {
        const filename = files[i].replace(".json","");
        if (filename === defaultTemplate) return _parseTemplate(filename);
        templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
        // set simple.json to default template
        if (filename === "simple") defaultIndex = i;
    }
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

async function promptAdditionalProperties(nft) {
    let addPrompt = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional properties?",
        'default': false
    }
    let answer = (await inquirer.prompt(addPrompt))["answer"];
    while (answer) {
        console.debug("adding additional properties");
        const keyPrompt = {
            'type': "input",
            'name': "key",
            'message': "Enter property key:"
        }
        const valuePrompt = {
            'type': "input",
            'name': "value",
            'message': "Enter property value:"
        }
        nft[(await inquirer.prompt(keyPrompt))["key"]] = (await inquirer.prompt(valuePrompt))["value"];
        answer = (await inquirer.prompt(addPrompt))["answer"];
    }
}

let defaultAttributes = false;
async function promptAdditionalAttributes(nft) {
    let addPrompt = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional attributes?",
        'default': defaultAttributes
    }
    let answer = (await inquirer.prompt(addPrompt))["answer"];
    while (answer) {
        if (!nft.hasOwnProperty("attributes"))
            nft.attributes = [];
        console.debug("adding additional attributes");
        const attribute = {};
        let addingToAttribute = true;
        while (addingToAttribute) {
            const keyPrompt = {
                'type': "input",
                'name': "key",
                'message': "Enter attribute key (blank to end):"
            }
            const valuePrompt = {
                'type': "input",
                'name': "value",
                'message': "Enter attribute value:"
            }
            let key = (await inquirer.prompt(keyPrompt))["key"];
            if (key.length === 0)
                addingToAttribute = false;            
            else 
                attribute[key] = (await inquirer.prompt(valuePrompt))["value"];
        }
        if (Object.keys(attribute).length > 0)
            nft.attributes.push(attribute);
        addPrompt.default = false;
        answer = (await inquirer.prompt(addPrompt))["answer"];
    }
}

async function promptNFTMetadata(schema, options) {
    const questions = [];
    // TODO
    // possibly add type from schema into message for entering inputs
    if (schema.hasOwnProperty("properties"))
        for (const [key, value] of Object.entries(schema.properties))
            questions.push({
                'type': 'input',
                'name': key,
                'message': `${value["description"]}: ${key} =`
            });
    // prompt for missing details if not provided as cli args
    const answers = await promptForMissing(options, questions);    
    // prompt to add additional properties & attributes
    await promptAdditionalProperties(answers);
    if (schema.hasOwnProperty("attributes") || Object.keys(schema).length == 0) // or if schema is 'blank'
        await promptAdditionalAttributes(answers);
    return answers;
}

function validateSchema(nft, schema) {
    console.debug("validating nft schema...");
    // replace empty values with null for flagging validation
    for (const [key, value] of Object.entries(nft))
        if (value === "") nft[key] = null;
    const validate = ajv.compile(schema);
    const valid = validate(nft);
    if (!valid) {
        console.error(validate.errors);
        throw "Error: unable to validate data";
    }
}

async function promptForMissing(cliOptions, prompts) {
    const questions = []
    for (const prompt of prompts) {
        // prompt.name = name;
        prompt.when = (answers) => {
            if (prompt.name == "attributes" && !defaultAttributes) {
                defaultAttributes = true;
                return false;
            }
            if (cliOptions[prompt.name]) {
                answers[prompt.name] = cliOptions[prompt.name]
                return false
            }
            return true
        }
        questions.push(prompt);
    }
    return inquirer.prompt(questions);
}



module.exports = {
    selectSchema,
    promptAdditionalProperties,
    promptAdditionalAttributes,
    promptNFTMetadata,
    validateSchema,
    promptForMissing
}