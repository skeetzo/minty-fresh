#!/usr/bin/env node

// This file contains the main entry point for the command line `minty` app, and the command line option parsing code.
// See minty.js for the core functionality.

const fs_ = require('fs/promises');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const colorize = require('json-colorizer');
const config = require('getconfig');
const { MakeMinty } = require('./minty');
const { deployContract, fileExists, saveDeploymentInfo } = require('./deploy');

const colorizeOptions = {
    pretty: true,
    colors: {
        STRING_KEY: 'blue.bold',
        STRING_LITERAL: 'green'
    }
};

async function main() {

    var program;

    // get .env of current dir so command must be ran at project root to use corresponding addon
    var exists = await fileExists('./.env');
    if (exists) {
        console.debug("minty addon .env found");
        const dotenv = require('dotenv').config({ path: './.env' });
        exists = await fileExists(path.resolve(".", dotenv.parsed.MINTY_ADDON));
        if (exists) {
            console.debug("minty addon found");
            program = await require(path.resolve(".", dotenv.parsed.MINTY_ADDON))();
        }
        else {
            console.error("minty addon missing");
            process.exit(0);
        }
    }
    else
        console.debug("minty addon .env not found");

    function _commandExists(cmd) {
        if (isNaN(program.commands.filter(obj => {return obj._name === cmd.toString()})))
            return true;
        return false;
    }

    if (!program) {
        program = new Command();
        program
          .name('Minty Fresh')
          .description('CLI to some JavaScript NFT utilities')
          .version('1.0.1');
      }

    // commands
    if (!_commandExists("mint"))
        program
            .command('mint <nft-schema>')
            .description('create a new NFT from a schema template')
            .option('-s, --schema <name>', 'The name of the schema template to use')
            .option('-i, --image <path>', 'The path to the image of the asset')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .option('-a, --address <address>', 'The address of a deployed contract')
            .option('-n, --name <name>', 'The name of the NFT')
            .option('-d, --description <desc>', 'A description of the NFT')
            .option('-o, --owner <address>', 'The ethereum address that should own the NFT.' +
                'If not provided, defaults to the first signing address.')
            .action(createNFT);

    if (!_commandExists("show"))
        program.command('show <token-id>')
            .description('get info about an NFT using its token ID')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .option('-c, --creation-info', 'include the creator address and block number the NFT was minted')
            .action(getNFT);

    if (!_commandExists("transfer"))
        program.command('transfer <token-id> <to-address>')
            .description('transfer an NFT to a new owner')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .action(transferNFT);

    if (!_commandExists("pin"))
        program.command('pin <token-id>')
            .description('"pin" the data for an NFT to a remote IPFS Pinning Service')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .action(pinNFTData);

    if (!_commandExists("deploy"))
        program.command('deploy')
            .description('deploy an instance of the Minty NFT contract')
            // .option('-o, --output <deploy-file-path>', 'Path to write deployment info to', config.deploymentConfigFile || 'minty-deployment.json')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .option('-n, --name <name>', 'The name of the token', 'Julep')
            .option('-s, --symbol <symbol>', 'A short symbol for the tokens', 'JLP')
            .action(deploy);

    // The hardhat and getconfig modules both expect to be running from the root directory of the project,
    // so we change the current directory to the parent dir of this script file to make things work
    // even if you call minty from elsewhere
    const rootDir = path.join(__dirname, '..');
    process.chdir(rootDir);

    await program.parseAsync(process.argv);
}

// ---- command action functions

async function createNFT(options) {
    const minty = await MakeMinty(options.contract);

    let {schema} = options;
    if (!schema) schema = await selectSchema();
    options = await promptNFTMetadata(schema, options);

    validateSchema(options, schema);

    const nft = await minty.createNFT(options, options.image);

    console.log('🌿 Minted a new NFT: ');

    const output = [
        ['Contract Name:', chalk.green(minty.name)],
        ['Contract Address:', chalk.yellow(minty.contract.address)],
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Metadata Address:', chalk.blue(nft.metadataURI)],
        ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
    ];
    if (nft.assetURI) {
        output.push(['Asset Address:', chalk.blue(nft.assetURI)]);
        output.push(['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)]);
    }
    alignOutput(output);

    console.log('NFT Metadata:');
    console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions));
}

async function getNFT(tokenId, options) {
    const { creationInfo: fetchCreationInfo } = options;
    const minty = await MakeMinty(options.contract);
    const nft = await minty.getNFT(tokenId, {fetchCreationInfo});

    const output = [
        ['Contract Name:', chalk.green(minty.name)],
        ['Contract Address:', chalk.yellow(minty.contract.address)],
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Owner Address:', chalk.yellow(nft.ownerAddress)],
    ];
    if (nft.creationInfo) {
        output.push(['Creator Address:', chalk.yellow(nft.creationInfo.creatorAddress)]);
        output.push(['Block Number:', nft.creationInfo.blockNumber]);
    }
    output.push(['Metadata Address:', chalk.blue(nft.metadataURI)]);
    output.push(['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)]);
    output.push(['Asset Address:', chalk.blue(nft.assetURI)]);
    output.push(['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)]);
    alignOutput(output);

    console.log('NFT Metadata:');
    console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions));
}

async function transferNFT(tokenId, toAddress, options) {
    const minty = await MakeMinty(options.contract);

    await minty.transferToken(tokenId, toAddress);
    console.log(`🌿 Transferred token ${chalk.green(tokenId)} to ${chalk.yellow(toAddress)}`);
}

async function pinNFTData(tokenId, options) {
    const minty = await MakeMinty(options.contract);
    const {assetURI, metadataURI} = await minty.pinTokenData(tokenId);
    console.log(`🌿 Pinned all data for token id ${chalk.green(tokenId)}`);
}

async function deploy(options) {
    // const filename = options.output;
    const info = await deployContract(options.name, options.symbol, options.contract);
    // await saveDeploymentInfo(info, filename);
    await saveDeploymentInfo(info);
}

// ---- helpers

async function selectSchema() {
    const SCHEMA_PATH = "./schemes";
    // get list of template files from available files in available /schema directories
    const templates = [];
    const localPath = path.join(__dirname, "../", SCHEMA_PATH), // path local to this script
          addonPath = path.join(process.env.PWD, SCHEMA_PATH);// path to where the cwd is
    const schemas = [];
    if (await fileExists(localPath)) schemas.push(localPath);
    if (addonPath != localPath && await fileExists(addonPath)) schemas.push(addonPath);
    let i = 0,
        defaultIndex = 0;
    for (const schemaPath of schemas)
        fs.readdirSync(schemaPath).forEach(file => {
            let filename = file.replace(".json","");
            templates.indexOf(filename) === -1 ? templates.push(filename) : console.debug(`duplicate template found: ${filename}`)
            // set simple.json to default template
            if (filename === "simple") defaultIndex = i;
            i++;
        });
    templates.push("blank");
    // prompt for templates
    const question = {
        'type': "rawlist",
        'name': "question",
        'message': "Select an NFT template:",
        'default': defaultIndex,
        'choices': templates
    }
    const template = (await inquirer.prompt(question))["question"];
    if (template === "blank") return {};
    return JSON.parse(fs.readFileSync(`${SCHEMA_PATH}/${template}.json`));
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
    const nft = {},
          questions = [];
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
    await promptAdditionalProperties(nft);
    if (schema.hasOwnProperty("attributes") || Object.keys(schema).length == 0) // or if schema is 'blank'
        await promptAdditionalAttributes(nft);
    return {...answers, ...nft};
}

////////////////////////////////////////////////////////////////////////////////////////////////

// TODO
// do this
function validateSchema(nft, schema) {
    // console.debug(nft);
    // console.debug(schema);
    console.log("validating nft schema...");
}

////////////////////////////////////////////////////////////////////////////////////////////////

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

function alignOutput(labelValuePairs) {
    const maxLabelLength = labelValuePairs
      .map(([l, _]) => l.length)
      .reduce((len, max) => len > max ? len : max);
    for (const [label, value] of labelValuePairs) {
        console.log(label.padEnd(maxLabelLength+1), value);
    }
}


// ---- main entry point when running as a script

// make sure we catch all errors
main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
})