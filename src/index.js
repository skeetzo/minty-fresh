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
const Ajv = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}

const colorizeOptions = {
    pretty: true,
    colors: {
        STRING_KEY: 'blue.bold',
        STRING_LITERAL: 'green'
    }
};

// ---- helpers
const { alignOutput } = require('./helpers.js');

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
        program.name('Minty Fresh')
          .description('CLI to some JavaScript NFT utilities')
          .version('1.0.1');
      }

    if (!_commandExists("mint"))
        program.command('mint <schema>')
            .description('mint a new NFT from an existing schema template')
            .option('-s, --schema <name>', 'The name of the schema template to mint')
            .option('-i, --image <path>', 'The path to the image asset')
            .option('-c, --contract <name>', 'The name of the contract', 'Minty')
            .option('-a, --address <address>', 'The address of a deployed contract')
            .option('-n, --name <name>', 'The name of the token')
            .option('-d, --description <desc>', 'A text description of the token')
            .option('-o, --owner <address>', 'The ethereum address that should own the token' +
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
    const nft = await minty.createNFT(options);
    console.log('🌿 Minted a new NFT: ');
    const output = [
        ['Contract Name:', chalk.green(minty.name)],
        ['Contract Address:', chalk.yellow(minty.contract.address)],
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Metadata Address:', chalk.blue(nft.metadataURI)],
        ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
    ];
    if (nft.assetURIs.length > 0 && nft.assetsGatewayURLs.length > 0 )
        for (let i=0;i<nft.assetsURIs.length;i++) {
            output.push(['Asset Address:', chalk.blue(nft.assetsURIs[i])]);
            output.push(['Asset Gateway URL:', chalk.blue(nft.assetsGatewayURLs[i])]);
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
    // output.push(['Asset Address:', chalk.blue(nft.assetsURIs)]);
    // output.push(['Asset Gateway URL:', chalk.blue(nft.assetsGatewayURLs)]);
    if (nft.assetURIs.length > 0 && nft.assetsGatewayURLs.length > 0 )
        for (let i=0;i<nft.assetsURIs.length;i++) {
            output.push(['Asset Address:', chalk.blue(nft.assetsURIs[i])]);
            output.push(['Asset Gateway URL:', chalk.blue(nft.assetsGatewayURLs[i])]);
        }
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

// ---- main entry point when running as a script

// make sure we catch all errors
main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
})