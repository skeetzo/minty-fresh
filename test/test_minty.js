
const chai = require('chai')
const expect = chai.expect

const { MakeMinty } = require('../src/classes/minty');

const truffleAssert = require('truffle-assertions');
const Minty = artifacts.require("./Minty.sol");


// do i need to do normal truffle deploy method like in sample?


describe('Minty', (accounts) => {

	const owner = accounts[0],
		  notOwner = accounts[1],
		  notOwner2 = accounts[2];

	let minty, mintyContract;

	const options = {
		// name,
		// symbol,
		// token,
		// address,
		// host, network, chainId,
		// 'skipMint':true
	};

	before(async () => {
    	mintyContract = await Minty.deployed();
		minty = await MakeMinty({
			'address': minty.address,
			'contract': 'Minty'
		});
	}) 

	describe('mint', () => {
		it('can create an NFT', async () => {
			const nft = await minty.createNFT(options, true);
			// check nft for correct values: metadata, metadataURI, CID, etc
			console.log(nft);
		})
		it('can mint an NFT', async () => {
			const nft = await minty.createNFT(options);
			// check nft for correct values: tokenId
			console.log(nft);
		})
	})

	describe('get', () => {
		it('can get creation info', async () => {
			const {blockNumber, creatorAddress} = await minty.getCreationInfo(0);
			console.log(blockNumber)
			console.log(creatorAddress)
			// check returned data
		})
		it('can get info', async () => {
			const nft = await minty.getNFT(0);
			// check nft for correct values
			console.log(nft);
		})
		it('can get metadata assets', async () => {
			const assets = await minty.getMetadataAssets(0);
			// check assets for correct key:value pairs
			console.log(assets);
		})
		it('can get token owner', async () => {
			const _owner = await minty.getTokenOwner(0);
			console.log(_owner);
			// expect owner to equal the minter / first account
			// expect(_owner,owner)
		})
	})

	describe('transfer', () => {
		it('can transfer token', () => {
	      	let ownerBalanceStart = await mintyContract.balanceOf(owner);
	      	let notOwnerBalanceStart = await mintyContract.balanceOf(notOwner);
			await minty.transferToken(0, notOwner);
			let ownerBalance = await mintyContract.balanceOf(owner);
	      	let notOwnerBalance = await mintyContract.balanceOf(notOwner);
	      	assert.isTrue(ownerBalance, ownerBalanceStart-1, "does not transfer out");
	      	assert.isTrue(notOwnerBalance, notOwnerBalanceStart+1, "does not transfer in");
		})
		it('xcan transfer batch tokens', () => {
			let ownerBalance = await mintyContract.balanceOf(owner);
	      	let notOwnerBalance = await mintyContract.balanceOf(notOwner);
			
			await minty.transferTokens([0,1], notOwner);

			ownerBalance = await mintyContract.balanceOf(owner);
	      	notOwnerBalance = await mintyContract.balanceOf(notOwner);
	      	notOwnerBalance = await mintyContract.balanceOf(notOwner2);

	      	// double batch transfers ?
			// await minty.transferTokens([[0,1],2], [notOwner, notOwner2]);
			// assert.isTrue(ownerBalance, ownerBalanceStart-1, "does not transfer out");
	      	// assert.isTrue(notOwnerBalance, notOwnerBalanceStart+1, "does not transfer in");
		})
	})

	describe('pin', () => {
		it('can pin', () => {
			let {assetURIs, metadataURI} = await minty.pin(0);
			// verify returned data
			console.log(assetURIs)
			console.log(metadataURI)
		})
		
		// not a thing? or not a thing that ever matters?
		// it('can unpin', () => {})
	})

})