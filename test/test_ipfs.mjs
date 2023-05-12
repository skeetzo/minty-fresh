import * as chai from 'chai';
import IPFS from '../src/classes/ipfs.mjs';
import * as fs from 'fs/promises';

const expect = chai.expect

describe('IPFS', () => {

	const cidOrURI = "ipfs://<cid>";
	const cid = "";
	const testData = undefined;
	const testJSON = {"a":"test","b":"balls"};
	const testString = JSON.stringify(testJSON);
	const testBase = undefined;
	const gatewayURL = "";

	describe('can add metadata', async () => {
		const metadata = {
			'name': "metadata-test.json",
			'path': "/metadata/metadata-test.json",
			'content': JSON.stringify(testJSON)
		};
		const { metadataCID, metadataURI } = await IPFS.add(metadata);
        expect(result).to.be.an('object');
        const expectedResult = {
        	'metadataCID': undefined,
        	'metadataURI': undefined
        };
        expect(result).to.include(expectedResult);
        expect(IPFS.validateCIDString(metadataCID)).to.be.true;
	})

	describe('can add local files', async () => {
		const file = {
			'name': "file-test.json",
			'path': "/image/minty-fresh.png",
			'content': await fs.readFile("../public/minty-fresh.png")
		};
		const { metadataCID, metadataURI } = await IPFS.add(file);
        expect(result).to.be.an('object');
        const expectedResult = {
        	'metadataCID': undefined,
        	'metadataURI': undefined
        };
        expect(result).to.include(expectedResult);
        expect(IPFS.validateCIDString(metadataCID)).to.be.true;	
	})

	describe('can remove', async () => {
		// TODO
		// same as add
		const result = await IPFS.remove();
	})
	describe('get IPFS', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<Uint8Array>} - contents of the IPFS object
		const result = await IPFS.getIPFS(cidOrURI);
        expect(result).to.be.an('string');
        expect(result).to.include(testData);
	})
	describe('get IPFS as string', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - the contents of the IPFS object as a string
		const result = await IPFS.getIPFSString(cidOrURI);
		expect(result).to.be.an('string');
		expect(result).to.equal(testString);
	})
	describe('get IPFS as base64', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
		const result = await IPFS.getIPFSBase64(cidOrURI);
		expect(result).to.be.an('string');
		expect(result).to.equal(testBase);
	})
	describe('get IPFS as json', async () => {
     // * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     // * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
		const result = await IPFS.getIPFSJSON(cidOrURI);
		expect(result).to.be.an('object');
		expect(result).to.equal(testJSON);
	})
	describe('can pin', async () => {
     // * @param {string} cidOrURI - a CID or ipfs:// URI
     // * @returns {Promise<void>}
		const result = await IPFS.pin(cidOrURI);
		// use isPinned to check pinned status
		expect(await IPFS.isPinned(cid)).to.be.true;
	})
	describe('can unpin', async () => {
		const result = await IPFS.unpin(cidOrURI);
		expect(await IPFS.isPinned(cid)).to.be.false;
	})
	describe('can check pinned', async () => {
     // * @param {string|CID} cid 
     // * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
		const cid = IPFS.extractCID(cidOrURI)
		const result = await IPFS.isPinned(cid);
	})
	describe('strips uri prefix', () => {
     // * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
     // * @returns the input string with the `ipfs://` prefix stripped off
		const result = IPFS.stripIpfsUriPrefix(cidOrURI);
		expect(result).to.not.include("ipfs://");
	})
	describe('ensures uri prefix', () => {
		const result = IPFS.ensureIpfsUriPrefix(cidOrURI);
		expect(result).to.include("ipfs://");
	})
	describe('makes gateway url', () => {
     // * @param {string} ipfsURI - an ipfs:// uri or CID string
     // * @returns - an HTTP url to view the IPFS object on the configured gateway.
		const result = IPFS.makeGatewayURL(cidOrURI);
		expect(result).to.equal(gatewayURL);
	})
	describe('extracts CID', () => {
        // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
		const result = IPFS.extractCID(cidOrURI);
		expect(result).to.equal(cid);
	})
	describe('validates CID', () => {
		const resultGood = IPFS.validateCIDString(cidOrURI)
		// returns true or false
		expect(resultGood).to.be.true;
		const resultBad = IPFS.validateCIDString("test balls");
		expect(resultBad).to.be.false;
	})
})