import * as fs from 'fs';
import inquirer from 'inquirer';
import { loadSchemaFromFile, fromSchema } from "./schema.mjs";

// TODO
// possibly add type from schema into message for entering inputs
export async function promptMetadata(metadata, schema) {

    // determine metadata base
    const schemaJSON = await loadSchemaFromFile(schema);

    const questions = [];
    if (schemaJSON.hasOwnProperty("properties"))
        for (const [key, value] of Object.entries(schemaJSON.properties))
            questions.push({
                'type': 'input',
                'name': key,
                'message': `${value["description"]}: ${key} =`
            });

    // prompt for missing details if not provided as cli args
    await promptForMissing(metadata, questions);    

    // prompt to add additional properties & attributes
    const properties = await fromSchema(schema);
    await promptAdditionalProperties(properties);
    if (schemaJSON.hasOwnProperty("attributes") || Object.keys(schemaJSON).length == 0) // or if schema is 'blank'
        await promptAdditionalAttributes(properties);
    return {
        schemaJSON,
        properties
    }
}

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
// verify this actually does what it used to do still
let defaultAttributes = false;
async function promptForMissing(cliOptions, prompts) {
    // console.log("cliOptions:", cliOptions);
    const questions = []
    for (const prompt of prompts) {
        // console.log(prompt)
        // prompt.name = name;
        prompt.when = (answers) => {
            console.log(answers)
            if (prompt.name == "attributes" && !defaultAttributes) {
                defaultAttributes = true;
                return false;
            }
            if (cliOptions[prompt.name]) {
                // cliOptions[prompt.name] = answers[prompt.name]
                answers[prompt.name] = cliOptions[prompt.name]
                return false
            }
            console.log(cliOptions)
            return true
        }
        questions.push(prompt);
    }
    return inquirer.prompt(questions);
}
