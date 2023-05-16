import * as chai from 'chai';
import NFT from '../src/classes/nft.mjs';

const expect = chai.expect

// Schemas:
// blank, complex, complicated-test, OpenSea, simplme, test, token-localization, token

const opts = {
    "schema": undefined,
    "name": "Test NFT",
    "symbol": "TNFT",
}

describe('NFT', () => {

	it('can get property', async () => {
		const nft = new NFT(opts);
	    const prop = nft.getProperty();
	    const prop2 = nft.getProperty("video");

		// TODO
	    // compare to a CID and local data
	    // expect(prop).to.equal()
	})

	it('can get properties', async () => {
		const nft = new NFT(opts);
	    const props = nft.getProperties();
	    // TODO
	    // compare each property
	})

	it('can get attribute', async () => {
		const nft = new NFT(opts);
	    const prop = nft.getAttribute();


	})

	it('can get attributes', async () => {
		const nft = new NFT(opts);
	    const prop = nft.getAttributes(sort=false);


	})

	it('can delete metadata', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._deleteMetadata();


	})

	it('can delete properties', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._deleteProperties();


	})

	it('can delete attributes', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._deleteAttributes();


	})

	it('can pin', async () => {
		const nft = new NFT(opts);
	    const prop = await nft.pin();


	})

	it('can unpin', async () => {
		const nft = new NFT(opts);
	    const prop = await nft.unpin();


	})

	it('can upload', async () => {
		const nft = new NFT(opts);
	    const prop = await nft.upload();


	})

	it('can upload metadata', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._uploadMetadata();


	})

	it('can upload properties', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._uploadProperties();


	})

	it('can upload property', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._uploadProperty(prop);


	})

	it('can upload attributes', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._uploadAttributes();


	})

	it('can upload attribute', async () => {
		const nft = new NFT(opts);
	    const prop = await nft._uploadAttribute(attr);


	})

});