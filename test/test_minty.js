
const chai = require('chai')
const expect = chai.expect

const config = require('getconfig');
const { MakeMinty } = require('../src/classes/minty.js');
const IPFS = require('../src/classes/ipfs.js');

const truffleAssert = require('truffle-assertions');
const Minty = artifacts.require("./Minty.sol");


// do i need to do normal truffle deploy method like in sample?


contract('Minty (client)', (accounts) => {

	const owner = accounts[0],
		  notOwner = accounts[1],
		  notOwner2 = accounts[2];

	let minty, mintyContract;

	const options = {
		contract: "Minty",
		symbol: "JLP",
		token: "Julep",
		// host, network, chainId,
		// 'skipMint':true
	};

	before(async () => {
    	mintyContract = await Minty.deployed();
		minty = await MakeMinty({...options, ...{'address':mintyContract.address}});
	}) 

	describe('mint', () => {
		it('can create an NFT', async () => {
			const nft = await minty.createNFT(options, true);
			assert.isOk(nft, "missing nft");
	        expect(nft.metadata).to.not.be.empty;
	        expect(nft.metadataCID).to.not.be.null;
	        expect(nft.metadataURI).to.not.be.null;
	        expect(nft.tokenId).to.be.null;
		})
		it('can mint an NFT', async () => {
			const nft = await minty.createNFT(options);
			assert.isOk(nft, "missing nft");
			expect(nft.tokenId).to.not.be.null;
		})
	})

	// must mint beforehand
	describe('get', () => {
		it('can get creation info', async () => {
			const {blockNumber, creatorAddress} = await minty.getCreationInfo(0);
			expect(blockNumber).to.not.be.null;
			expect(creatorAddress).to.not.be.null;
		})
		it('can get info', async () => {
			const nft = await minty.getNFT(0);
	        expect(nft.metadata).to.not.be.empty;
	        expect(nft.metadataCID).to.not.be.null;
	        expect(nft.metadataURI).to.not.be.null;
		})
		it('can get metadata assets', async () => {
			const assets = await minty.getMetadataAssets(0);
			// check assets for correct key:value pairs
			expect(assets).to.have.any.keys(...config.assetTypes)
		})
		it('can get token owner', async () => {
			assert.equal(await minty.getTokenOwner(0), owner, "does not get token owner");
		})
	})

	describe('transfer', () => {
		it('can transfer token', async () => {
	      	let ownerBalanceStart = await mintyContract.balanceOf(owner);
	      	let notOwnerBalanceStart = await mintyContract.balanceOf(notOwner);
			await minty.transferToken(0, notOwner);
			let ownerBalance = await mintyContract.balanceOf(owner);
	      	let notOwnerBalance = await mintyContract.balanceOf(notOwner);
	      	assert.equal(ownerBalance, parseInt(ownerBalanceStart)-1, "does not transfer out");
	      	assert.equal(notOwnerBalance, parseInt(notOwnerBalanceStart)+1, "does not transfer in");
		})
		it('xcan transfer batch tokens', async () => {
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
			let {assetURIs, metadataURI} = await minty.pin(0);
			console.log(assetURIs)
			console.log(metadataURI)
			expect(assetURIs).to.not.be.null;
			expect(metadataURI).to.not.be.null;
		})
		
		// not a thing? or not a thing that ever matters?
		// it('can unpin', () => {})
	})

})