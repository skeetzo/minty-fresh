
import * as chalk from "chalk"
import * as colorize from 'json-colorizer';

import { MakeMinty } from '../classes/minty.mjs';
import { alignOutput, colorizeOptions } from '../utils/helpers.mjs';

// ---- command action functions

export const mintNFT = async function(options, _minty=null) {
    const minty = _minty || await MakeMinty(options);
    const nft = await minty.mintNFT(options, options.schema);
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

export const mintNFTs = async function(options, _minty=null) {
    const minty = _minty || await MakeMinty(options);
    const nfts = await minty.mintNFTs(options, options.schema);
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

export const getNFT = async function(tokenId, options) {
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

export const transferNFT = async function(tokenId, toAddress, options) {
    const minty = await MakeMinty(options);
    await minty.transfer(tokenId, toAddress);
    console.log(`🌿 Transferred token ${chalk.green(tokenId)} to ${chalk.yellow(toAddress)}`);
}

export const transferNFTs = async function(tokenIds, toAddresses, options) {
    const minty = await MakeMinty(options);
    await minty.transferBatch(tokenIds, toAddresses);
    console.log(`🌿 Transferred tokens ${chalk.green(tokenIds)} to ${chalk.yellow(toAddresses)}`);
}

export const pinNFTData = async function(tokenId, options) {
    const minty = await MakeMinty(options);
    const {metadataURI} = await minty.pin(tokenId);
    console.log(`🌿 Pinned all data for token id ${chalk.green(tokenId)}`);
}

export const unpinNFTData = async function(tokenId, options) {
    const minty = await MakeMinty(options);
    const {metadataURI} = await minty.unpin(tokenId);
    console.log(`🌿 Unpinned all data for token id ${chalk.green(tokenId)}`);
}

export const burnNFT = async function(tokenId, options) {
    const minty = await MakeMinty(options);
    const {metadataURI} = await minty.burn(tokenId);
    console.log(`🌿 Burned token id ${chalk.green(tokenId)}`);
}
