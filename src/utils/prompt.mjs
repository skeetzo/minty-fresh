import * as fs from 'fs';
import inquirer from 'inquirer';

export async function promptSchema(templates=[], defaultIndex=0) {
    if (templates.length==1) return templates[0];
    // prompt for templates
    const question = {
        'type': "rawlist",
        'name': "question",
        'message': "Select an NFT template:",
        'default': defaultIndex,
        'choices': templates
    }
    return (await inquirer.prompt(question))["question"];
}

async function promptAdditionalProperties(metadata) {
    let addPrompt = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional properties?",
        'default': false
    }
    let answer = (await inquirer.prompt(addPrompt))["answer"];
    while (answer) {
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
        metadata[(await inquirer.prompt(keyPrompt))["key"]] = (await inquirer.prompt(valuePrompt))["value"];
        answer = (await inquirer.prompt(addPrompt))["answer"];
    }
}

async function promptAdditionalAttributes(metadata) {
    const addPrompt = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional attributes?",
        'default': defaultAttributes
    }
    let answer = (await inquirer.prompt(addPrompt))["answer"];
    while (answer) {
        if (!metadata.hasOwnProperty("attributes"))
            metadata.attributes = [];
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
            if (key.length === 0) addingToAttribute = false;            
            else attribute[key] = (await inquirer.prompt(valuePrompt))["value"];
        }
        if (Object.keys(attribute).length > 0)
            metadata.attributes.push(attribute);
        addPrompt.default = false;
        answer = (await inquirer.prompt(addPrompt))["answer"];
    }
}

// TODO
// possibly add type from schema into message for entering inputs
export async function promptMetadata(options) {
    const schema = await NFT.loadSchemaFromFile(options.schema);
    // determine metadata base
    const metadata = await NFT.fromSchema(options.schema, options);
    console.debug("metadata:");
    console.debug(metadata);
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

// TODO
// verify this actually does what it used to do still
let defaultAttributes = false;
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
