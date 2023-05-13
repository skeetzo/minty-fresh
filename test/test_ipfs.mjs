import * as chai from 'chai';
import IPFS from '../src/classes/ipfs.mjs';
import * as fs from 'fs/promises';

const expect = chai.expect

describe('IPFS', () => {

	// const cidOrURI = "ipfs://QmemwweAcxj9MU7yEyzgRNuoJjeLKguy77wKXLihfZ7Z9A";
	const cidOrURI = "ipfs://QmemwweAcxj9MU7yEyzgRNuoJjeLKguy77wKXLihfZ7Z9A/metadata-test.json";
	const cid = "QmemwweAcxj9MU7yEyzgRNuoJjeLKguy77wKXLihfZ7Z9A";
	const testData = [123, 34, 97, 34, 58, 34, 116, 101, 115, 116, 34, 44, 34, 98, 34, 58, 34, 98, 97, 108, 108, 115, 34, 125];
	const testJSON = {"a":"test","b":"balls"};
	const testString = JSON.stringify(testJSON);
	const testBase = "eyJhIjoidGVzdCIsImIiOiJiYWxscyJ9";
	const gatewayURL = "http://localhost:8080/ipfs/QmemwweAcxj9MU7yEyzgRNuoJjeLKguy77wKXLihfZ7Z9A/metadata-test.json";

	it('can add metadata', async () => {
		const metadata = {
			'name': "metadata-test.json",
			'path': "/metadata/metadata-test.json",
			'content': JSON.stringify(testJSON)
		};
		const result = await IPFS.add(metadata);
        expect(result).to.be.an('object');
        const expectedResult = {
        	'metadataCID': cid,
        	'metadataURI': cidOrURI
        };
        expect(result).to.include(expectedResult);
        expect(IPFS.validateCIDString(result.metadataCID)).to.be.true;
	})

	it('can add local files', async () => {
		const file = {
			'name': "file-test.json",
			'path': "/image/minty-fresh.png",
			'content': await fs.readFile("./public/minty-fresh.png")
		};
		const result = await IPFS.add(file);
        expect(result).to.be.an('object');
        const expectedResult = {
        	'metadataCID': "QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5",
        	'metadataURI': "ipfs://QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5/file-test.json"
        };
        expect(result).to.include(expectedResult);
        expect(IPFS.validateCIDString(result.metadataCID)).to.be.true;	
	})

	it('can remove', async () => {
		// TODO
		// same as add
		const result = await IPFS.remove();
	})
	it('get IPFS', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<Uint8Array>} - contents of the IPFS object
		const result = await IPFS.getIPFS(cidOrURI);
        expect(result).to.be.an('Uint8Array');
        expect(result).to.include(testData);
	})
	it('get IPFS as string', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - the contents of the IPFS object as a string
		const result = await IPFS.getIPFSString(cidOrURI);
		expect(result).to.be.an('string');
		expect(result).to.equal(testString);
	})
	it('get IPFS as base64', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
		const result = await IPFS.getIPFSBase64(cidOrURI);
		expect(result).to.be.an('string');
		expect(result).to.equal(testBase);
	})
	it('get IPFS as json', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
		const result = await IPFS.getIPFSJSON(cidOrURI);
		expect(result).to.be.an('object');
		expect(result).to.deep.equal(testJSON);
	})

	
	it('strips uri prefix', () => {
     // * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
     // * @returns the input string with the `ipfs://` prefix stripped off
		const result = IPFS.stripIpfsUriPrefix(cidOrURI);
		console.log(result);
		expect(result).to.not.include("ipfs://");
	})
	it('ensures uri prefix', () => {
		const result = IPFS.ensureIpfsUriPrefix(cidOrURI);
		console.log(result);
		expect(result).to.include("ipfs://");
	})
	it('makes gateway url', () => {
     // * @param {string} ipfsURI - an ipfs:// uri or CID string
     // * @returns - an HTTP url to view the IPFS object on the configured gateway.
		const result = IPFS.makeGatewayURL(cidOrURI);
		console.log(result);
		expect(result).to.equal(gatewayURL);
	})
	it('extracts CID', () => {
        // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
		const result = IPFS.extractCID(cidOrURI);
		// console.log(result);
		expect(result).to.equal(cid);
	})
	it('validates CID', () => {
		const resultGood = IPFS.validateCIDString(cid)
		// returns true or false
		expect(resultGood).to.be.true;
		// TODO: this should fail
		// const resultBad = IPFS.validateCIDString("test balls");
		// expect(resultBad).to.be.false;
	})

	describe('pinning services', () => {
		beforeEach(function (done) {
			setTimeout(function(){
				done();
			}, 1000);
		});
		it('can pin', async () => {
	     // * @param {string} cidOrURI - a CID or ipfs:// URI
	     // * @returns {Promise<void>}
			const result = await IPFS.pin(cidOrURI);
			// use isPinned to check pinned status
			expect(await IPFS.isPinned(cid)).to.be.true;
		})
		it('can check pinned', async () => {
	     // * @param {string|CID} cid 
	     // * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
			const cid = IPFS.extractCID(cidOrURI)
			const result = await IPFS.isPinned(cid);
			expect(result).to.be.true;
		})
		it('can unpin', async () => {
			const result = await IPFS.unpin(cidOrURI);
			expect(await IPFS.isPinned(cid)).to.be.false;
		})
		it('can check pinned', async () => {
	     // * @param {string|CID} cid 
	     // * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
			const cid = IPFS.extractCID(cidOrURI)
			const result = await IPFS.isPinned(cid);
			expect(result).to.be.false;
		})
	});
})



