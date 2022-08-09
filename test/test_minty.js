
const chai = require('chai')
const expect = chai.expect

const config = require('getconfig');
const { MakeMinty } = require('../src/classes/minty.js');

// const Minty = artifacts.require("./Minty.sol");

const fs_ = require('fs/promises');
const IMAGE_SOURCE = "../src/public/minty-fresh.png";

// uses truffle contract method to access accounts, does not require actual contract
contract('Minty (client)', (accounts) => {

	const owner = accounts[0],
		  notOwner = accounts[1],
		  notOwner2 = accounts[2];

	let minty, mintyContract;
	let minted = false;

	const options = {
		schema: "test",
		contract: "Minty",
		symbol: "JLP",
		token: "Julep",
		// host, network, chainId,
		// 'skipMint':true
	};

	// before(async () => {
    	// mintyContract = await Minty.deployed();
		// minty = await MakeMinty({...options, ...{'address':mintyContract.address}});
	// }) 

	describe('deploy', () => {
		it('can deploy Minty', async () => {
			minty = await MakeMinty(options);
			mintyContract = minty.contract;
			assert.isTrue(true, "does not deploy Minty");
		})
		it('can deploy MintyPreset', async () => {
			const mintyPreset = await MakeMinty({...options, ...{contract:'MintyPreset'}});
			const mintyPresetContract = mintyPreset.contract;
			assert.isTrue(true, "does not deploy MintyPreset");
		})
		it('xcan deploy any ERC721 contract', async () => {})
	})

	describe('mint', () => {
		it('can create an NFT', async () => {
			const nft = await minty.createNFT(options, true);
			assert.isOk(nft, "missing nft");
	        expect(nft.metadata).to.not.be.empty;
	        expect(nft.metadataCID).to.not.be.null;
	        expect(nft.metadataURI).to.not.be.null;
	        expect(nft.tokenId).to.be.null;
	        minted = true;
		})
		it('can mint an NFT', async () => {
			const nft = await minty.createNFT(options);
			assert.isOk(nft, "missing nft");
			expect(nft.tokenId).to.not.be.null;
			minted = true;
		})
	})

	// must mint beforehand
	describe('get', () => {
		it('can get creation info', async () => {
			assert.isTrue(minted, "must mint beforehand");
			const {blockNumber, creatorAddress} = await minty.getCreationInfo(0);
			expect(blockNumber).to.not.be.null;
			expect(creatorAddress).to.not.be.null;
		})
		it('can get info', async () => {
			assert.isTrue(minted, "must mint beforehand");
			await minty.createNFT(options);
			const nft = await minty.getNFT(0);
	        expect(nft.tokenId).to.not.be.null;
	        expect(nft.metadata).to.not.be.empty;
	        expect(nft.metadata.name).to.not.be.empty;
	        expect(nft.metadata.description).to.not.be.empty;
	        expect(nft.metadata.image).to.not.be.empty;
	        expect(nft.metadataCID).to.not.be.null;
	        expect(nft.metadataURI).to.not.be.null;
		})
		it('can get metadata assets', async () => {
			assert.isTrue(minted, "must mint beforehand");
			const assets = await minty.getMetadataAssets(0);
			expect(assets).to.have.any.keys(...config.assetTypes)
			// TODO: can possibly check that each asset value is a CID string
		})
		it('can get asset data', async () => {
			// load the data from ipfs and compare it to the data from the path
			const assets = await minty.getNFTAssets(0);
			const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
			console.log("assets:",assets)
			// verify that each asset value is a valid CID that returns the original data form
			for (const [ass, value] in Object.entries(assets)) {
				console.log(ass, value, base64regex.test(value))
				if (ass == "image") assert.isTrue(base64regex.test(value));
			}
		})
		it('can get token owner', async () => {
			assert.equal(await minty.getTokenOwner(0), owner, "does not get token owner");
		})
	})

	describe('transfer', () => {
		it('can transfer token', async () => {
			assert.isTrue(minted, "must mint beforehand");
	      	let ownerBalanceStart = await mintyContract.balanceOf(owner);
	      	let notOwnerBalanceStart = await mintyContract.balanceOf(notOwner);
			await minty.transferToken(0, notOwner);
			let ownerBalance = await mintyContract.balanceOf(owner);
	      	let notOwnerBalance = await mintyContract.balanceOf(notOwner);
	      	assert.equal(ownerBalance, parseInt(ownerBalanceStart)-1, "does not transfer out");
	      	assert.equal(notOwnerBalance, parseInt(notOwnerBalanceStart)+1, "does not transfer in");
			assert.equal(await minty.getTokenOwner(0), notOwner, "does not get token owner after transfer");
		})
		it('xcan transfer batch tokens', async () => {
			assert.isTrue(minted, "must mint beforehand");
			// let ownerBalance = await mintyContract.balanceOf(owner);
			// let notOwnerBalance = await mintyContract.balanceOf(notOwner);
			// await minty.transferTokens([0,1], notOwner);
			// ownerBalance = await mintyContract.balanceOf(owner);
			// notOwnerBalance = await mintyContract.balanceOf(notOwner);
			// notOwnerBalance = await mintyContract.balanceOf(notOwner2);
	      	// double batch transfers ?
			// await minty.transferTokens([[0,1],2], [notOwner, notOwner2]);
			// assert.equal(ownerBalance, ownerBalanceStart-1, "does not transfer out");
	      	// assert.equal(notOwnerBalance, notOwnerBalanceStart+1, "does not transfer in");
		})
	})

	describe('pin', () => {
		it('can pin', async () => {
			assert.isTrue(minted, "must mint beforehand");
			let {assetURIs, metadataURI} = await minty.pin(0);
			expect(assetURIs).to.not.be.empty;
			expect(metadataURI).to.not.be.null;
		})
		
		// not a thing? or not a thing that ever matters?
		// it('can unpin', () => {})
	})

})