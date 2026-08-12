#!/usr/bin/env node
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';
import { Command } from 'commander';
import { readMetadata, writeMetadata } from './utils/exiftool.js';

const collectionsDir = "/home/skeetzo/Projects/Content/ContentNFTs"

const opts = {
    keep: true, // keep exiftool open between file reads
    verbose: true // verbose output from exiftool
}

function parseForFiles(filepath) {
    if (fs.lstatSync(filepath).isDirectory()) return fs.readdirSync(filepath)
    return [filepath];
}

async function main() {

    const program = new Command();
    program.name('Minty Fresh: Metadata')
      .description('CLI to some JavaScript file metadata utilities')
      .version('1.4.14', '-v', '--version', 'Output the current version');

    program.command('read')
        .description('read metadata from provided filepath')
        .option('-f, --filepath <path>', 'The filepath to read')
        .action(async ({filepath}) => {
            const files = parseForFiles(filepath);
            if (files.length > 1)
                for (const file of files)
                    await readMetadata(filepath+"/"+file, opts);
            else
                await readMetadata(filepath, opts);
        });

    program.command('write')
        .description('write metadata to file from provided args')
        .option('-f, --filepath <path>', 'The filepath to write to')
        // these should be turned into being added via a loop that just checks for anything after double hyphen --
        .option('-L, --location <number>', 'The location id for the content')
        .option('-T, --title <string>', 'The title of the content')
        .option('-D, --description <string>', 'The description of the content')
        .option('-P, --performers <numbers>', 'The performers involved')
        .option('-DI, --director <address>', 'The director')
        .option('-PR, --producer <address>', 'The producer')
        .option('-B, --beneficiary <address>', 'The beneficiary contract')
        .option('-Pr, --price <number>', 'The price to purchase')
        .option('-TY, --type <number>', 'The type of scene')
        .option('-F, --fee <number>', 'The fee for trades')
        .option('-M, --max <number>', 'The max that can be minted')
        .option('-DA, --date <number>', 'The date created')
        .option('-C, --collection <string>', 'The collection name for reference')
        .action(async ({filepath, filepathWrite, ...metadata}) => {
            if (metadata.performers) metadata.performers = metadata.performers.split(",").map((n)=>parseInt(n));
            else metadata.performers = [];
            const files = parseForFiles(filepath);
            if (files.length > 1)
                for (const file of files) {
                    await writeMetadata(filepath+"/"+file, metadata, opts);
                    if (metadata.collection != "") {
                        await fsp.mkdir(path.join(collectionsDir, metadata.collection), { recursive: true });
                        // not allowed to move files to external drives
                        // fsp.rename(filepath+"/"+file, path.join(collectionsDir, metadata.collection, path.basename(filepath+"/"+file)));
                        try {await fsp.copyFile(filepath+"/"+file, path.join(collectionsDir, metadata.collection, path.basename(filepath+"/"+file)))}
                        catch (err) {};
                    }
                }
            else {
                await writeMetadata(filepath, metadata, opts);
                if (metadata.collection != "") {
                    await fsp.mkdir(path.join(collectionsDir, metadata.collection), { recursive: true });
                    // not allowed to move files to external drives
                    // fsp.rename(filepath, path.join(collectionsDir, metadata.collection, path.basename(filepath)));
                    try {await fsp.copyFile(filepath, path.join(collectionsDir, metadata.collection, path.basename(filepath)))}
                    catch (err) {};
                }
            }
        });

    await program.parseAsync(process.argv);
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
})