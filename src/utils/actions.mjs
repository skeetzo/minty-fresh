
import * as chalk from "chalk"
import * as colorize from 'json-colorizer';

import Minty from '../classes/minty.mjs';
import { alignOutput, colorizeOptions } from '../utils/helpers.mjs';

// ---- command action functions

export const mint = async function(options) {
    const nft = await Minty.mintNFT(options);
    if (!options.quiet) {
        if (options.skipMint)
            console.log(`🌿 Pretend minted a new ${minty.name} ${options.schema}: `);
        else
            console.log(`🌿 Minted a new ${minty.name} ${options.schema}: `);
        const output = [
            ['Contract Name:', chalk.green(minty.name)],
            ['Contract Address:', chalk.yellow(minty.address)],
            ['Token ID:', chalk.green(nft.tokenId)],
            ['Metadata Address:', chalk.blue(nft.metadataURI)],
            ['Metadata Gateway URL:', chalk.blue(nft.metadataGatewayURL)],
        ];
        for (let i=0;i<nft.assetsURIs.length;i++) {
            output.push(['Asset Address:', chalk.blue(nft.assetsURIs[i])]);
            output.push(['Asset Gateway URL:', chalk.blue(nft.assetsGatewayURLs[i])]);
        }
        alignOutput(output);
        if (options.displayMetadata) {
            console.log('NFT Metadata:');
            console.log(colorize(JSON.stringify(nft.metadata), colorizeOptions));
        }
    }
    else
        console.log('Token ID: %s', chalk.green(nft.tokenId));
}

export const mintBatch = async function(options) {
    const nfts = await Minty.mintNFTs(options);
    if (!options.quiet) {
        if (options.skipMint)
            console.log(`🌿 Practice minted new ${minty.name} ${options.schema}s: `);
        else
            console.log(`🌿 Minted new ${minty.name} ${options.schema}s: `);
        const output = [
            ['Contract Name:', chalk.green(minty.name)],
            ['Contract Address:', chalk.yellow(minty.address)],
        ];
        for (let i=0;i<nfts.length;i++) {
            output.push(['Token ID:', chalk.green(nfts[i].tokenId)]);
            output.push(['Metadata Address:', chalk.blue(nfts[i].metadataURI)]);
            output.push(['Metadata Gateway URL:', chalk.blue(nfts[i].metadataGatewayURL)]);
            for (let j=0;j<nfts[i].assetsURIs.length;j++) {
                output.push(['Asset Address:', chalk.blue(nfts[i].assetsURIs[j])]);
                output.push(['Asset Gateway URL:', chalk.blue(nfts[i].assetsGatewayURLs[j])]);
            }
        }
        alignOutput(output);
        if (options.displayMetadata) {
            console.log('NFT Metadatas:');
            for (let i=0;i<nfts.length;i++)
                console.log(colorize(JSON.stringify(nfts[i].metadata), colorizeOptions));
        }
    }
    else
        for (let i=0;i<nfts.length;i++)
            console.log('Token ID: %s', chalk.green(nfts[i].tokenId));  
}

export const get = async function(tokenId, options) {
    const nft = await Minty.getNFT(tokenId, options);
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

export const transfer = async function(tokenId, toAddress, options) {
    await Minty.transfer(tokenId, toAddress, options);
    console.log(`🌿 Transferred token ${chalk.green(tokenId)} to ${chalk.yellow(toAddress)}`);
}

export const transferBatch = async function(tokenIds, toAddresses, options) {
    await Minty.transferBatch(tokenIds, toAddresses, options);
    console.log(`🌿 Transferred tokens ${chalk.green(tokenIds)} to ${chalk.yellow(toAddresses)}`);
}

export const pin = async function(tokenId, options) {
    const {metadataURI} = await Minty.pin(tokenId, options);
    console.log(`🌿 Pinned all data for token id ${chalk.green(tokenId)}`);
}

export const unpin = async function(tokenId, options) {
    const {metadataURI} = await Minty.unpin(tokenId, options);
    console.log(`🌿 Unpinned all data for token id ${chalk.green(tokenId)}`);
}

export const burn = async function(tokenId, options) {
    const {metadataURI} = await Minty.burn(tokenId, options);
    console.log(`🌿 Burned token id ${chalk.green(tokenId)}`);
}

export const burnBatch = async function(tokenIds, options) {
    const {metadataURI} = await Minty.burnBatch(tokenIds, options);
    console.log(`🌿 Burned token ids ${chalk.green(tokenIds)}`);
}
