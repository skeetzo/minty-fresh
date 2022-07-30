
const chalk = require('chalk');
const colorize = require('json-colorizer');

const { MakeMinty } = require('./minty');

const { alignOutput, colorizeOptions } = require('./helpers.js');

// ---- command action functions

async function createNFT(options, _minty=null) {
    const minty = _minty || await MakeMinty(options);
    const nft = await minty.createNFT(options, options.schema);
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

async function createNFTs(options, _minty=null) {
    const minty = _minty || await MakeMinty(options);
    const nfts = await minty.createNFTs(options, options.schema);
    if (!options.quiet) {
        if (options.skipMint)
            console.log(`🌿 Pretend minted new ${minty.name} ${options.schema}s: `);
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

module.exports = {
    createNFT,
    createNFTs,
    getNFT,
    transferNFT,
    pinNFTData
}