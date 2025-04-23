import * as fs from 'fs';

import { expect } from 'chai';

import { Asset } from '../src/classes/asset.mjs';

const IMAGE_SOURCE = "./public/minty-fresh.png";
const IMAGE_SOURCE_TEST = "./test/helpers/mintyfresh";

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

const metadata = {};
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
        const content = await asset.getFile();
        // fs.writeFile('testfile', new Buffer(content),() => {})
        const test = fs.readFileSync(IMAGE_SOURCE_TEST);
        // console.log(content)
        // console.log(test)
        expect(content).to.deep.equal(test);
    })

    xit("can get ipfs", async () => {})

    xit("can encrypt", async () => {
		const asset = new Asset(optsEncrypted);

        const { content, key } = await asset.encrypt();
        // expect(content).to.equal()
    })

    xit("can upload", async () => {
    	const asset = new Asset(opts);

        const { cid, uri, key } = await asset.upload();
        // expect(content).to.equal()
    })

    xit("can get assets", async () => {

        const assets =  Asset.getAssets(metadata, schema);

        console.log(assets);

        expect(assets.length).to.equal(1)
    })

    xit("can upload assets", async () => {

        const assets =  Asset.uploadAssets(metadata, schema);

        console.log(assets);

        // expect(metadata["image"]).to.equal()

    })


})