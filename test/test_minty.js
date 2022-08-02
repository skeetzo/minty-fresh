
const chai = require('chai')
const expect = chai.expect

const { MakeMinty } = require('../src/classes/minty');


// do i need to do normal truffle deploy method like in sample?


describe('Minty', () => {

	let minty;
	const options = {
		// name,
		// symbol,
		// token,
		// address,
		// host, network, chainId,
		'skipMint':true
	};
	let tokenId;

	before(async () => {
	  minty = await MakeMinty(options);
	}) 

	describe('mint', () => {
		it('can create an NFT', () => {
			const nft = minty.createNFT(options);
			// expect(calculator.add(1, 1)).to.equal(2)
		})
		it('can mint an NFT', () => {
			const nft = minty.createNFT();
			tokenId = nft.tokenId;
		})
	})

	describe('get', () => {
		it('can get creation info', () => {})
		it('can get uri by token id', () => {})
		it('can get metadata by token id', () => {})
		it('can get metadata assets', () => {})
		// it('can not get token owner', () => {})
	})

	describe('transfer', () => {
		it('can transfer token', () => {})
		it('can transfer batch tokens', () => {})
	})

	describe('pin', () => {
		it('can pin', () => {})
		// it('can unpin', () => {})
	})

})