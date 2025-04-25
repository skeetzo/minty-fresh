import * as fs from 'fs';

import { expect } from 'chai';

import { Asset } from '../src/classes/asset.mjs';
import { NFT } from '../src/classes/nft.mjs';

const IMAGE_SOURCE = "./public/minty-fresh.png";
const IMAGE_SOURCE_TEST = "./test/helpers/mintyfresh";
// const IMAGE_SOURCE_TEST_E = "./test/helpers/mintyfreshe";
// const EKEY = "82c26f7233f846adf8aa040b74976530";

const CID = "QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5";
const URI = "ipfs://QmPEx5zdQroQ6XvvPD8MkqQyBp8845QsdxdC1kL7Tbk7L5/minty-fresh.png";

const CID2 = "QmNoBeFnFR19AE8j55qrZ2CFimRhRnApLDKtudm9pC3ndx";
const URI2 = "ipfs://QmNoBeFnFR19AE8j55qrZ2CFimRhRnApLDKtudm9pC3ndx/minty-fresh.json";

const metadata = {
    "name": "minty-fresh",
	"image": IMAGE_SOURCE,
	// "cid": CID,
	// "uri": URI,
	// "content": "",
	// "path": IMAGE_SOURCE,
	"encrypt": false
};

// const KEY = "";
const opts2 = {
    name: "image",
    cid: "cid",
    uri: "uri",
    path: IMAGE_SOURCE,
    // data: {},
    encrypt: false
}
const asset = new Asset(opts2)

const opts = {
	name: "nftname",
    assets: [],
    metadata,
	schema: "content",
    schemaJSON: {},
    tokenId: 0,
    owner: null,
	metadataCID: "",
	metadataURI: false
}

const schema = "content";



describe("NFT", () => {

    it("can create nft", async () => {
        const nft = new NFT(opts);
        expect(nft.name).to.equal(opts.name)
        expect(nft.schema).to.equal(opts.schema)
        expect(nft.tokenId).to.equal(opts.tokenId)
        // expect(nft.path).to.equal(opts.path)
        // expect(nft.name).to.equal(opts.name)
        // expect(nft.cid).to.equal(opts.cid)
        // expect(nft.uri).to.equal(opts.uri)
        // expect(asset.content).to.equal(opts.content)
        // expect(nft.path).to.equal(opts.path)
        // expect(asset.data).to.equal(opts.data)
        // expect(nft.encrypt).to.be.false;
        // expect(nft.encrypted).to.be.false;
    });

    it("can get JSON", async () => {
        const nft = new NFT(opts);
        const json = nft.toJSON();
        // console.log(json)
        // nft.toJSON
        expect(json.name).to.equal(opts.name)
        expect(json.schema).to.equal(opts.schema)
        expect(json.tokenId).to.equal(opts.tokenId)
        // expect(json.path).to.equal(opts.path)
    })

    // it("can get toString", async () => {
    //     // nft.toString
    //     const nft = new NFT(opts);
    //     const str = nft.toString();
    //     // nft.toJSON
    //     expect(str.name).to.equal(opts.name)
    //     expect(str.schema).to.equal(opts.schema)
    //     expect(str.tokenId).to.equal(opts.tokenId)
    //     expect(str.path).to.equal(opts.path)
    // })

    // it("can get asset", async () => {
    //     const nft = new NFT(opts);
    //     // nft.getAsset
    //     const asset = nft.getAsset();
    //     console.log(asset)
    // })

    it("can get assets", async () => {
        const nft = new NFT(opts);
        // nft.getAssets
        const assets = nft.getAssets();
        console.log(assets)
        expect(assets.length).to.equal(1)
    })

    it("can pin", async () => {
        const nft = new NFT(opts);
        // nft.pin
        const {assetURIs, metadataURI} = await nft.pin();
    })
    it("can unpin", async () => {
        const nft = new NFT(opts);
        // nft.unpin
        // TODO: finish after pin is finished
    })

    // this is handled in the asset test
    it("can upload", async () => {
        const nft = new NFT(opts);
        nft.upload
    })

    it("can upload metadata", async () => {
        const nft = new NFT(opts);
        // uploadMetameta
        await nft.uploadMetadata();
        console.log(nft.metadata)
        console.log(nft)
        // expect(nft.metadataCID).to.equal(CID2);
        // expect(nft.metadataURI).to.equal(URI2);
    });

})