
import * as config from "getconfig";
import * as fs from 'fs';
import * as path from "path";

import { fileExists } from '../utils/helpers.mjs';
import { IPFS } from './ipfs.mjs';

// meant to model basic expected FileObject from 
// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsfileswritepath-content-options
// as well as juggle multiple file types to easily ensure data is uploaded / fetched locally

export class Asset {
	
	constructor(opts) {
		name = opts.name || "image";
		// CID on IPFS
		cid = opts.cid || null;
		// URI on IPFS
		uri = opts.uri || null;
		// (base64) data stored on IPFS 
		content = opts.content || null;
		// path to local file
		path = opts.path || null;
		// locally stored object data of the asset
		data = opts.data || null;
		// File mode to store the entry with (see https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation)
		  // mode?: number | string
		mode = opts.mode || null;
	}

	toString() {
		return {
			name: this.name,
			cid: this.cid,
			uri: this.uri,
			content: this.content,
			path: this.path,
			mode: this.mode
		}
	}

	// load data from local path (if exists) or IPFS
	async getData() {
		if (this.data) return this.data
		return null;
	}

	// load file from local path
	getFile() {
		return fs.readFileSync(this.path);
	}

	// load data from IPFS
	async getIPFS() {
		return IPFS.getIPFS(this.cid || this.uri);
	}

    // When you add an object to IPFS with a directory prefix in its path,
    // IPFS will create a directory structure for you. This is nice, because
    // it gives us URIs with descriptive filenames in them e.g.
    // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
    // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
    async upload() {
        if (!fileExists(this.path)) throw "incorrect asset path";
        const file = { 
            name: path.basename(this.path).replace(/\/[^a-z0-9\s]\//gi, '_'),
            path: `/${this.name}s/${path.basename(this.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
            content: fs.readFileSync(this.path)
        };
        const { metadataCID, metadataURI } = await IPFS.add(file);
        this.cid = metadataCID;
        this.uri = metadataURI;
        return { metadataCID, metadataURI };
        // const assetURI = IPFS.ensureIpfsUriPrefix(assetCID) + '/' + basename;        
    }

    // should innately replace metadata[key] values with the cid
    static async uploadAssets(metadata, schema="default") {
    	for (const asset of Asset.getAssets(metadata, schema)) {
            const { metadataCID, metadataURI } = await asset.upload();
            metadata[asset.name] = metadataCID;
        }
    }

	// TODO
	// what is this even meant to do?
	static getAsset(metadata, assetName) {
		const newAsset = Asset({
			name: assetName,
			// cid: 
			// uri: 
			// content: 
			// path: 
			// data: 
			// mode: 
		})
		return newAsset;
	}

	// TODO
	// return the known asset keys found within the provided metadata
	static getAssets(metadata, schema) {
        const assets = [];

        const assetTypes = [...config.assetTypes, ...Asset.loadAssetsFromSchema(schema)];
        const unique = [...new Set(assetTypes)];

        for (const key of unique)
            for (const [_key, value] of Object.entries(metadata))
                if (key == _key)
                    assets[key] = value;
        return assets;
	}

	// TODO
	// return the asset types for the schema
	static async loadAssetsFromSchema(schema) {return []}

}




    //     const assets = [];
    //     for (const [key, filePathOrCID] of Object.entries(this.getAssets())) {
    //         const asset = new Asset({cid:assetCID,uri:assetURI})

    //         if (IPFS.validateCIDString(filePathOrCID)) {
    //             assets[key] = filePathOrCID;
    //             continue; // must not already be a CID string
    //         }

    //         const {assetCID, assetURI} = await this.uploadAsset(filePathOrCID, key);
    //         this.metadata[key] = assetCID;
    //         assets.push();
    //         // assets[key].cid = assetCID;
    //         // assets[key].uri = assetURI;
    //     }
    //     this._assets = assets;
    // }
