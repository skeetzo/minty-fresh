import * as getconfig from "getconfig";
const config = getconfig.default;
import * as fs from 'fs';
import * as path from "path";

import { fileExists } from '../utils/helpers.mjs';
import { IPFS } from './ipfs.mjs';
import { encryptFile, encryptPublicKey } from "../utils/crypto.mjs";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// meant to model basic expected FileObject from 
// https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md#ipfsfileswritepath-content-options
// as well as juggle multiple file types to easily ensure data is uploaded / fetched locally

const default_asset_types = ["image","video"];

const cachePath = `./cache-assets-${process.env.NODE_ENV}.txt`;

const REMOVE_ON_UPLOAD = false;
const REMOVE_TMP_ON_UPLOAD = true;

// check local file cache for filepath
function checkCache(filepath) {
  try {
    const fileContent = fs.readFileSync(cachePath, 'utf8');
    const lines = fileContent.split(/\r?\n/); // Split by LF or CRLF
    for (const line of lines) {
      if (line.includes(filepath)) {
		console.debug("cache:", filepath);
      	return JSON.parse(line);
      }
    }
  } catch (err) {
  	if (!err.message.includes("no such file or directory"))
	    console.error('Error reading file:', err.message);
  }
  return false;
}

function saveToCache(saveme) {
	fs.appendFile(cachePath, saveme+"\n", (err) => {
		console.debug("cached:", saveme);
		if (err) {
			console.error('Error appending to file:', err);
			return;
		}
	});
}





export class Asset {
	
	constructor(opts) {
		this.name = opts.name || "image";
		// CID on IPFS
		this.cid = opts.cid || null;
		// URI on IPFS
		this.uri = opts.uri || null;
		if (this.cid)
			this.uri = IPFS.makeGatewayURL(this.cid);
		// (base64) data stored on IPFS 
		this.content = opts.content || null;
		// path to local file
		this.path = opts.path || null;
		// locally stored object data of the asset
		// data = opts.data || null;
		// File mode to store the entry with (see https://en.wikipedia.org/wiki/File_system_permissions#Numeric_notation)
		  // mode?: number | string
		this.mode = opts.mode || null;
		this.tmp = opts.tmp || false;

		this.encrypt = opts.encrypt || false;
		this.encrypted = opts.encrypted || false;
		this.base_uri = opts.base_uri || "ipfs://";
	}

	toJSON() {
		return {
			name: this.name,
			cid: this.cid,
			uri: this.uri,
			content: this.content,
			path: this.path,
			mode: this.mode,
			encrypt: this.encrypt,
			encrypted: this.encrypted
		}
	}

	toString() {
		return {
			name: this.name,
			cid: this.cid,
			uri: this.uri,
			content: this.content,
			path: this.path,
			mode: this.mode,
			encrypt: this.encrypt,
			encrypted: this.encrypted
		}
	}

	async encryptFile() {
		if (this.encrypted) return { content:this.content };
		const content = await encryptFile(this.path);
		this.content = content;
		this.encrypted = true;
		return content;
	}

	// async getData() {
		// if (this.data) return this.data
		// return null;
	// }

	// load file from local path
	async getFile() {
		if (this.content) return this.content;
		if (this.encrypt) return await this.encryptFile();
		else return fs.readFileSync(this.path);
	}

	// load data from IPFS
	async getIPFS() {
		return IPFS.getIPFS(this.cid || this.uri);
	}

	async uploadContent() {
		// const cached = checkCache(path.basename(name));
		// if (cached) return {metadataCID:cached.cid,metadataURI:cached.uri};
		console.debug("uploading asset data...")
        const file = { 
            content: this.content,
            // name: path.basename(this.path).replace(/\/[^a-z0-9\s]\//gi, '_'),
            // path: `/${path.basename(this.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
        };
        const { metadataCID, metadataURI } = await IPFS.add(file, this.base_uri);
        this.content = null;
        this.cid = metadataCID;
        this.uri = metadataURI;
        // saveToCache(JSON.stringify({cid:metadataCID,uri:metadataURI}));
        return { metadataCID, metadataURI };
    }

    // When you add an object to IPFS with a directory prefix in its path,
    // IPFS will create a directory structure for you. This is nice, because
    // it gives us URIs with descriptive filenames in them e.g.
    // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM/cat-pic.png' instead of
    // 'ipfs://QmaNZ2FCgvBPqnxtkbToVVbK2Nes6xk5K4Ns6BsmkPucAM'
    async upload() {
    	if (this.cid) return { metadataCID: this.cid, metadataURI: this.uri }
		if (this.path && fs.lstatSync(this.path).isDirectory())
			throw "found folder instead of file";
		if (!this.path) throw "missing content for upload";

		// TODO: add config or runtime toggle to skip cache check
		// check if asset has been uploaded recently already; return it if it has
		const cached = checkCache(path.basename(this.path));
		if (cached) return {metadataCID:cached.cid,metadataURI:cached.uri};
		console.debug("uploading asset:", this.name);
		const content = await this.getFile();
        const file = { 
            content,
            name: path.basename(this.path).replace(/\/[^a-z0-9\s]\//gi, '_'),
            path: `/${path.basename(this.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
            // path: `/${this.name}s/${path.basename(this.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
            // path: `/assets/${this.name}s/${path.basename(this.path)}`.replace(/\/[^a-z0-9\s]\//gi, '_'),
            // path: `/assets/${this.name}s`.replace(/\/[^a-z0-9\s]\//gi, '_'),
        };
        const { metadataCID, metadataURI } = await IPFS.add(file, this.base_uri);
        this.cid = metadataCID;
        this.uri = metadataURI;
        saveToCache(JSON.stringify({path:file.path,name:file.name,cid:metadataCID,uri:metadataURI}));
	    try {
	    	// removes temporary upload location
	    	if (REMOVE_TMP_ON_UPLOAD && typeof content === 'string' && content.includes("/tmp/"))
		    	fs.unlinkSync(content);
		    else if (REMOVE_TMP_ON_UPLOAD && this.path.includes("/tmp/")) {
		    	fs.unlinkSync(this.path);
			    fs.unlinkSync(this.path.replace("thumbnails", "encryptions"))
		    }
		    else if (REMOVE_TMP_ON_UPLOAD) {
		    	// removes any leftover encrypted files
		    	fs.unlinkSync(path.join(__dirname, "../../tmp/encryptions/", path.basename(this.path)));
		    }
		    // removes original upload location
		    if (REMOVE_ON_UPLOAD)
		    	fs.unlinkSync(this.path);
	    } catch (err) {}

        return { metadataCID, metadataURI };
    }

    // should innately replace metadata[key] values with the cid
    static async uploadAssets(metadata, schema="default", encrypt) {
    	for (const asset of Asset.getAssets(metadata, schema, encrypt)) {
            const { metadataCID, metadataURI } = await asset.upload();
            metadata[asset.name] = metadataCID;
        }
    }

	// TODO: add more asset types / double check the implementation works at all
	// return the known asset keys found within the provided metadata
	static getAssets(metadata, schema, encrypt) {
        const assets = [];
        const assetTypes = [...default_asset_types, ...Asset.loadAssetsForSchema(schema)];
        const unique = [...new Set(assetTypes)];
        for (const key of unique)
            for (const [_key, value] of Object.entries(metadata)) {
                if (key == _key) { 
                	console.debug("found asset:", key);
					const asset = new Asset({encrypt});
            		asset.name = key;
                	if (value) {
	                	console.debug("asset value:", value);
                		// cid uri or path
                		if (Buffer.isBuffer(value)) asset.content = value;
                		else if (IPFS.validateCIDString(value)) asset.cid = value;
		                else asset.path = value;
                	}
                	console.debug("asset:", asset);
                	assets.push(asset);
                }
            }

        // this must return an array of Asset objects
        return assets;
	}

	// TODO
	// return the asset types for the schema1
	static loadAssetsForSchema(schema) {
		// console.log("loading assets for schema:", schema);
		if (schema == "content")
			return ["uri","thumbnail"];
		// TODO: update this to some how dynamically return "assets" which are basically files that could be many different things or groups of things
		return []
	}


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
