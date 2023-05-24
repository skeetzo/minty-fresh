import * as chai from 'chai';
import NFT from '../src/classes/nft.mjs';
import IPFS from '../src/classes/ipfs.mjs';

const expect = chai.expect

// Schemas:
// blank, complex, complicated-test, OpenSea, simplme, test, token-localization, token

const opts = {
    "schema": undefined,
    "name": "Test NFT",
    "symbol": "TNFT",
    "attributes": [ { "trait_type":"Base", "value":"Starfish" }] // from docs.opensea.io
}

const metadata = {
	"video": "file/path",
	"image": "../public/minty-fresh.png"
}

const CID_ATTRIBUTE = "";
const CID_IMAGE = "";
const CID_VIDEO = "";
const CID_METADATA = "";

describe('NFT', () => {

	describe('GET', () => {

		it('can get property', async () => {
			const nft = new NFT(opts);
		    const name = nft.getProperty("name");
		    const symbol = nft.getProperty("symbol");
		    expect(name).to.be.an('string');
		    expect(name).to.equal(opts.name);
			expect(symbol).to.be.an('string');
		    expect(symbol).to.equal(opts.symbol);
		})

		it('can get properties', async () => {
			const nft = new NFT(opts);
		    const props = nft.getProperties();
		    expect(props.name).to.be.an('string');
		    expect(props.name).to.equal(opts.name);
		    expect(props.symbol).to.be.an('string');
		    expect(props.symbol).to.equal(opts.symbol);
		})

		it('can get attribute', async () => {
			const nft = new NFT(opts);
		    const attr = nft.getAttribute("Base");
		    expect(attr).to.be.an('string');
		    expect(attr).to.equal(opts.attributes[0]["trait_type"]);
		})

		it('can get attributes', async () => {
			const nft = new NFT(opts);
		    const attributes = nft.getAttributes(sort=false);
		    expect(attributes).to.be.an('array');
		    expect(attributes[0]).to.be.an('object');
		})

	})

	describe('DELETE', () => {

		it('can delete metadata', async () => {
			const nft = new NFT(opts);
		    const result = await nft._deleteMetadata();
		    expect(result).to.be.true;
		})

		it('can delete properties', async () => {
			const nft = new NFT(opts);
		    const result = await nft._deleteProperties();
		    expect(result).to.be.true;
		})

		it('can delete attributes', async () => {
			const nft = new NFT(opts);
		    const result = await nft._deleteAttributes();
		    expect(result).to.be.true;
		})

	})

	describe('PIN', () => {

		it('can pin', async () => {
			const nft = new NFT(opts);
		    await nft.pin();
		    const result = await IPFS.isPinned(nft.metadataCID);
		    expect(result).to.be.true;
		})

		it('can unpin', async () => {
			const nft = new NFT(opts);
		    await nft.unpin();
			const result = await IPFS.isPinned(nft.metadataCID);
		    expect(result).to.be.false;
		})

	})

	describe('UPLOAD', () => {

		it('can upload properties', async () => {
			const nft = new NFT(opts);
		    await nft._uploadProperties();
		    expect(nft.metadata.image).to.be.an('string');
		    expect(nft.metadata.image).to.equal(CID_IMAGE);
		    expect(nft.metadata.video).to.be.an('string');
		    expect(nft.metadata.video).to.equal(CID_VIDEO);
		})

		it('can upload property', async () => {
			const nft = new NFT(opts);
		    const { metadataCID, metadataURI } = await nft._uploadProperty("image");
		    expect(nft.metadata.image).to.be.an('string');
		    expect(nft.metadata.image).to.equal(CID_IMAGE);
		    expect(metadataCID).to.equal(CID_IMAGE);
		})

		// TODO: change this to uploading an attribute thats a file / asset that needs to be uploaded to IPFS first then returned as an actual CID
		it('can upload attributes', async () => {
			const nft = new NFT(opts);
		    const { metadataCID, metadataURI } = await nft._uploadAttributes();
		    const attr = nft.getAttribute("Base");
		    expect(attr).to.be.an('string');
		    expect(attr).to.equal(opts.attributes[0]["value"]);
		})

		it('can upload attribute', async () => {
			const nft = new NFT(opts);
		    const { metadataCID, metadataURI } = await nft._uploadAttribute(attr);
		    expect(metadataCID).to.be.an('string');
		    expect(metadataCID).to.be.equal(CID_ATTRIBUTE);
		})

		it('can upload metadata', async () => {
			const nft = new NFT(opts);
		    const { metadataCID, metadataURI } = await nft._uploadMetadata();
		    expect(metadataCID).to.be.an('string');
		    expect(metadataCID).to.be.equal(CID_METADATA);
		})

		// TODO: possibly redundant, or the above _ functions won't work
		it('can upload', async () => {
			const nft = new NFT(opts);
		    const { metadataCID, metadataURI } = await nft.upload();
		    expect(metadataCID).to.be.an('string');
		    expect(metadataCID).to.be.equal(CID_METADATA);
		})

	})

});