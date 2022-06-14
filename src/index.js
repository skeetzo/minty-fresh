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
            .command('mint <image-path>')
            .description('create a new NFT from an image file')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
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

    // console.log(program)

    // The hardhat and getconfig modules both expect to be running from the root directory of the project,
    // so we change the current directory to the parent dir of this script file to make things work
    // even if you call minty from elsewhere
    const rootDir = path.join(__dirname, '..');
    process.chdir(rootDir);

    await program.parseAsync(process.argv);
}

// ---- command action functions

async function createNFT(imagePath, options) {
    const minty = await MakeMinty(options.contract);

    ////////////////////////////////////////////////////////////////////////

    // get list of template files from available files in /schema
    const templates = [];

    // TODO
    // i'm probably going to need to fix the pathing here when called from an addon
    // and i'll want to update it to also check from the addons local schema dir
    fs.readdirSync("./schema").forEach(file => {templates.push(file.replace(".json",""))});
    // prompt for templates
    const question = {
        'type': "rawlist",
        'name': "question",
        'message': "Select an NFT template:",
        'default': 0,
        'choices': templates
    }
    const schema = JSON.parse(fs.readFileSync(`./schema/${(await inquirer.prompt(question))["question"]}.json`));

    // create questions from schema
    const questions = [], attributes = [], properties = [];
    // if value is not set, prompt to set
    for (const [key, value] of Object.entries(schema)) {
        // base properties
        if (value === "")
            questions.push({
                'type': 'input',
                'name': key,
                'message': `Enter a(n) ${key} for your new NFT: `
            });
        // attributes
        if (key === "attributes" && Array.isArray(value))
            for (const attribute of value)
                if (attribute["value"] === "" && attribute["trait_type"] != "")
                    attributes.push({
                        'type': 'input',
                        'name': attribute["trait_type"],
                        'message' : `Enter a(n) ${attribute["trait_type"]} attribute for your new NFT: `
                    });
        // properties
        if (key === "properties" && typeof value === "object")
            for (const [key_, value_] of Object.entries(schema[key]))
                properties.push({
                    'type': 'input',
                    'name': key_,
                    'message' : `Enter a(n) ${key_} property for your new NFT: `
                });
    }

    // prompt for missing details if not provided as cli args
    const answers, attributeAnswers, propertiesAnswers = await promptForMissing(options, [questions, attributes, properties]);
    // const answers = await promptForMissing(options, template);

    // TODO
    // flesh these functions out if necessary to prompt for additional properties and attributes
    function promptForAdditionalAttributes(existingAnswers) {}
    function promptForAdditionalProperties(existingAnswers) {}
    
    // prompt to add additional properties or attributes
    const addA = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional attributes?"
    }
    if (await inquirer.prompt(addA)["answer"])
        attributeAnswers = await promptForAdditionalAttributes(attributeAnswers);
    
    const addP = {
        'type': "confirm",
        'name': "answer",
        'message': "Add additional properties?"
    }
    if (await inquirer.prompt(addP)["answer"])
        propertiesAnswers = await promptForAdditionalProperties(propertiesAnswers);

    // TODO
    // finish testing

    console.log(answers);
    console.log(attributeAnswers);
    console.log(propertiesAnswers);

    return;

    ////////////////////////////////////////////////////////////////////////

    // do i want to mint from an image path or any path when general minting? does every nft have an asset?
    // some nfts might just be metadata? that don't point to any further assets?
    // some nfts might point to multiple assets

    // TODO
    // separate creation process amongst multiple NFT types: simple, complex

    ////////////////////////////////////////////////////////////////////////

    const nft = await minty.createNFTFromAssetFile(imagePath, answers);
    console.log('🌿 Minted a new NFT: ');

    alignOutput([
        ['Contract Name:', chalk.green(minty.name)],
        ['Contract Address:', chalk.yellow(minty.contract.address)],
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Metadata Address:', chalk.blue(nft.metadataURI)],
        ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
        ['Asset Address:', chalk.blue(nft.assetURI)],
        ['Asset Gateway URL:', chalk.blue(nft.assetGatewayURL)],
    ]);
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

async function promptForMissing(cliOptions, prompts) {
    const questions = []
    for (const [name, prompt] of Object.entries(prompts)) {
        prompt.name = name;
        prompt.when = (answers) => {
            if (cliOptions[name]) {
                answers[name] = cliOptions[name]
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