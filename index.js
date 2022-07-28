#!/usr/bin/env node
const config = require('getconfig');

const Ajv = require("ajv");
const ajv = new Ajv(); // options can be passed, e.g. {allErrors: true}
const chalk = require('chalk');
const colorize = require('json-colorizer');
const { Command } = require('commander');
const fs = require('fs/promises');
const inquirer = require('inquirer');
const { MakeMinty } = require('./minty');
const path = require('path');

const { alignOutput, colorizeOptions, fileExists } = require('./helpers.js');

// the .env variable to use to reference the path for a minty "addon"
const MINTY_ADDON_KEY = config.mintyAddonPath || "MINTY_ADDON";

async function main() {

    let program;

    // get .env of current dir so command must be ran at project root to use corresponding addon
    if (fileExists('./.env')) {
        const dotenv = require('dotenv').config({ path: './.env' });
        if (fileExists(path.join(process.cwd(), dotenv.parsed[MINTY_ADDON_KEY]))) {
            program = await require(path.join(process.cwd(), dotenv.parsed[MINTY_ADDON_KEY]))();        
    }
    else
        console.debug("minty addon .env not found");

    if (!program) {
        program = new Command();
        program.name('Minty Fresh')
          .description('CLI to some JavaScript NFT utilities')
          .version('1.2.2', '-v', '--version', 'Output the current version');

        // The hardhat and getconfig modules both expect to be running from the root directory of the project,
        // so we change the current directory to the parent dir of this script file to make things work
        // even if you call minty from elsewhere
        const rootDir = path.join(__dirname, '..');
        process.chdir(rootDir);
    }

    // returns true|false depending on if the cmd string exists
    function _commandExists(cmd) {if (isNaN(program.commands.filter(obj => {return obj._name === cmd.toString()}))) return true;return false;}

    // TODO
    // figure out an easier way to add all the repeated blockchain/network options

    if (!_commandExists("mint"))
        program.command('mint')
            .description('Mint a new NFT from an existing schema template')
            .option('-s, --schema <name>', 'The name of the schema template to mint')
            .option('-i, --image <path>', 'The path to the image asset')
            .option('-n, --name <name>', 'The name of the token')
            .option('-d, --description <desc>', 'A text description of the token')
            .option('-o, --owner <address>', 'The ethereum address that should own the token' +
                'If not provided, defaults to the first signing address.')
            .option('-cN, --contract <name>', 'The name of the contract', CONTRACT_NAME)
            .option('-cA, --contract-address <address>', 'The address of a deployed contract')
            .option('-n, --network <name>', 'The name of the network to connect to', 'development')
            .option('-cId, --chainId <number>', 'The network id', '1337')
        .action(createNFT);

    if (!_commandExists("show"))
        program.command('show <token-id>')
            .description('Get info about an NFT using its token ID')
            .option('-fA, --fetch-assets', 'Asset data will be fetched from IPFS')
            .option('-cI, --creation-info', 'Include the creator address and block number the NFT was minted')
            .option('-cN, --contract <name>', 'The name of the contract', CONTRACT_NAME)
            .option('-cA, --contract-address <address>', 'The address of a deployed contract')
            .option('-n, --network <name>', 'The name of the network to connect to', 'development')
            .option('-cId, --chainId <number>', 'The network id', '*')
        .action(getNFT);

    if (!_commandExists("transfer"))
        program.command('transfer <token-id> <to-address>')
            .description('Transfer an NFT to a new owner')
            .option('-cN, --contract <name>', 'The name of the contract', CONTRACT_NAME)
            .option('-cA, --contract-address <address>', 'The address of a deployed contract')
            .option('-n, --network <name>', 'The name of the network to connect to', 'development')
            .option('-cId, --chainId <number>', 'The network id', '*')
        .action(transferNFT);

    if (!_commandExists("pin"))
        program.command('pin <token-id>')
            .description('"pin" the data for an NFT to a remote IPFS Pinning Service')
            .option('-cN, --contract <name>', 'The name of the contract', CONTRACT_NAME)
            .option('-cA, --contract-address <address>', 'The address of a deployed contract')
            .option('-n, --network <name>', 'The name of the network to connect to', 'development')
            .option('-cId, --chainId <number>', 'The network id', '*')
        .action(pinNFTData);

    await program.parseAsync(process.argv);
}

// ---- command action functions

async function createNFT(options) {
    const minty = await MakeMinty(options);
    const nft = await minty.createNFT(options, options.schema);
    console.log('🌿 Minted a new NFT: ');
    const output = [
        ['Contract Name:', chalk.green(minty.name)],
        ['Contract Address:', chalk.yellow(minty.contract.address)],
        ['Token ID:', chalk.green(nft.tokenId)],
        ['Metadata Address:', chalk.blue(nft.metadataURI)],
        ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
    ];
    for (let i=0;i<nft.assetsURIs.length;i++) {
        output.push(['Asset Address:', chalk.blue(nft.assetsURIs[i])]);
        output.push(['Asset Gateway URL:', chalk.blue(nft.assetsGatewayURLs[i])]);
    }
    alignOutput(output);
    console.log('NFT Metadata:');
    console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions));
}

async function getNFT(tokenId, options) {
    const { creationInfo: fetchCreationInfo, fetchAssets: fetchAssetData } = options;
    const minty = await MakeMinty(options);
    const nft = await minty.getNFT(tokenId, {fetchAssetData, fetchCreationInfo});
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
    const minty = await MakeMinty(options);
    await minty.transferToken(tokenId, toAddress);
    console.log(`🌿 Transferred token ${chalk.green(tokenId)} to ${chalk.yellow(toAddress)}`);
}

async function pinNFTData(tokenId, options) {
    const minty = await MakeMinty(options);
    const {assetURI, metadataURI} = await minty.pinTokenData(tokenId);
    console.log(`🌿 Pinned all data for token id ${chalk.green(tokenId)}`);
}

// ---- main entry point when running as a script

// make sure we catch all errors
main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
})