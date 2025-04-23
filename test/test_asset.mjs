import * as fs from 'fs';

import { expect } from 'chai';

import { Asset } from '../src/classes/asset.mjs';

const IMAGE_SOURCE = "./public/minty-fresh.png";
const IMAGE_SOURCE_TEST = "./test/helpers/mintyfresh";
// const IMAGE_SOURCE_TEST_E = "./test/helpers/mintyfreshe";
// const EKEY = "82c26f7233f846adf8aa040b74976530";

const opts = {
	name: "image",
	cid: "cid",
	uri: "uri",
	path: IMAGE_SOURCE,
	// data: {},
	encrypt: false
}

const optsEncrypted = {
	name: "image",
	cid: "cid",
	uri: "uri",
	path: IMAGE_SOURCE,
	// data: {},
	encrypt: true
}

const CID = "QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5";
const URI = "ipfs://QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5/minty-fresh.png";
// const KEY = "";

const metadata = {
	"image": "",
	"cid": CID,
	"uri": URI,
	"content": "",
	"path": IMAGE_SOURCE,
	"encrypt": false
};
const schema = "content";


describe("Asset", () => {

    it("can create asset", async () => {
        const asset = new Asset(opts);
        expect(asset.name).to.equal(opts.name)
        expect(asset.cid).to.equal(opts.cid)
        expect(asset.uri).to.equal(opts.uri)
        // expect(asset.content).to.equal(opts.content)
        expect(asset.path).to.equal(opts.path)
        // expect(asset.data).to.equal(opts.data)
        expect(asset.encrypt).to.be.false;
        expect(asset.encrypted).to.be.false;
    });

    it("can create encrypted asset", async () => {
        const asset = new Asset(optsEncrypted);
        expect(asset.name).to.equal(opts.name)
        expect(asset.cid).to.equal(opts.cid)
        expect(asset.uri).to.equal(opts.uri)
        expect(asset.path).to.equal(opts.path)
        expect(asset.encrypt).to.be.true;
        expect(asset.encrypted).to.be.false;
    });

    it("can get asset", async () => {
        const asset = new Asset(opts);
        const { content, key } = await asset.getFile();
        const test = fs.readFileSync(IMAGE_SOURCE_TEST);
        expect(content).to.deep.equal(test);
    })

    xit("can get ipfs", async () => {})

    it("can encrypt", async () => {
		const asset = new Asset(optsEncrypted);
        const { content, key } = await asset.encryptFile();
		// encryption contents & key change everytime so no real point in comparing to past results
        expect(key).to.be.ok;
    })

    it("can upload", async () => {
    	const asset = new Asset(opts);
        const { metadataCID, metadataURI, key } = await asset.upload();
        expect(metadataCID).to.equal(CID)
        expect(metadataURI).to.equal(URI)
        expect(key).to.equal("");
    })


    it("can upload encrypted", async () => {
    	const asset = new Asset(optsEncrypted);
        const { metadataCID, metadataURI, key } = await asset.upload();
        expect(metadataCID).to.not.equal(CID)
        expect(metadataURI).to.not.equal(URI)
        expect(key).to.be.ok; // or be ok
    })

    it("can get assets", async () => {
        const assets =  Asset.getAssets(metadata, schema);
        // console.log(assets);
        expect(assets.length).to.equal(1);
        expect(assets[0].cid).to.equal(CID);
    })

    it("can upload assets", async () => {
    	const asset = new Asset(opts);
        const { content, key } = await asset.getFile();
        metadata["content"] = content;
        await Asset.uploadAssets(metadata, schema);
        console.log(metadata)
        expect(metadata["image"]).to.equal(CID) // or URI?
        expect(metadata["image"]).to.equal(metadata["cid"]) // or URI?

    })

    it("can upload assets encrypted", async () => {
    	const asset = new Asset(optsEncrypted);
        const { content, key } = await asset.getFile();
        metadata["content"] = content;
        metadata["key"] = key;
    	metadata["encrypt"] = true;
        await Asset.uploadAssets(metadata, schema);
        console.log(metadata)
        expect(metadata["image"]).to.not.equal(metadata["cid"]);
        expect(metadata["image_key"]).to.be.ok;
    })


})