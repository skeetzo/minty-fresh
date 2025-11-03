
import * as getconfig from "getconfig";
const config = getconfig.default;
import { CID } from 'multiformats/cid'
import all from 'it-all'
// import * as path from "path";

import { concat, toString } from 'uint8arrays';
const uint8ArrayConcat = concat;
const uint8ArrayToString = toString;
// import { uint8ArrayToString } from 'uint8arrays/to-string';

import { create } from "kubo-rpc-client";
const IPFS_CLIENT = create(config.ipfsApiUrl);

// ipfs.add parameters for more deterministic CIDs

// const BASE_URI = "ipfs://";

// config.default()

export class IPFS {
    
    ipfsAddOptions = {
      cidVersion: 1,
      hashAlg: 'sha2-256',
    'wrapWithDirectory':true
    }

    writeOptions = { 
      'cidVersion': 1,
      'hashAlg': 'sha2-256',
      'create':true,
      'parents':true,
      'wrapWithDirectory':true
    }

    constructor(opts={}) {
        // if (opts.client) IPFS_CLIENT = opts.client;
        // else if (opts.ipfsApiUrl) IPFS_CLIENT = create(opts.ipfsApiUrl);
        // else 
            // IPFS_CLIENT = create(config.ipfsApiUrl);
        // console.log("connecting to IPFS urls:", opts.client, opts.ipfsApiUrl, config.ipfsApiUrl);
        // IPFS.prefix = "ipfs" || opts.prefix;
    }

    // file must have: name, path, and content
    static async add(file, baseUri="ipfs://") {
        console.log("file:", file);
        // console.debug(file)
        console.debug(`adding IPFS path: ${file.path}`);
        const { cid: metadataCID } = await IPFS_CLIENT.add(file, IPFS.ipfsAddOptions);
        const metadataURI = IPFS.ensureIpfsUriPrefix(metadataCID, baseUri) + "/" + file.name;
        // TODO
        // can use the ls check to prevent duplicates
        // possibly add dialogue to confirm y/n to overwrite existing?
        // for await (const filee of IPFS_CLIENT.ls(metadataCID)) {
          // console.log(filee.path)
        // }
        // will fail if the MFS is written poorly / incorrectly

        // TODO
        // test if this is necessary at all
        async function writeMFS() {
            try {
                await IPFS_CLIENT.files.write(file.path, file.content, IPFS.writeOptions)
            }
            catch (err) {
                const IPFS_MISSING_FILE = "file does not exist";
                if (err.message.includes(IPFS_MISSING_FILE)) {
                    console.debug("missing file:", file.path);
                }
                else
                    console.error(err)
            }
        }

        // https://github.com/ipfs/ipfs-webui/issues/897
        // $ ipfs files cp /ipfs/QmeoTsSvQvNtKxhHdPA3gy6RWD6ghVwdkjBeUWWPiHdmn6 /hello.txt
        async function copyToWebUI() {
            try {
                await IPFS_CLIENT.files.cp(`/ipfs/${metadataCID}`, "/"+file.name, IPFS.ipfsAddOptions);
            }
            catch (err) {
                const IPFS_DUPLICATE_CP = "directory already has entry by that name";
                if (err.message.includes(IPFS_DUPLICATE_CP)) {
                    console.debug("duplicate copy:", file.name);
                }
                else
                    console.error(err);
            }
        }

        // await writeMFS();
        await copyToWebUI();

        return { metadataCID:metadataCID.toString(), metadataURI };
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<Uint8Array>} - contents of the IPFS object
     */
    static async getIPFS(cidOrURI) {
        // console.log(cidOrURI)
        const cid = IPFS.stripIpfsUriPrefix(cidOrURI);
        return uint8ArrayConcat(await all(IPFS_CLIENT.cat(cid)));
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and return it as a string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - the contents of the IPFS object as a string
     */
    static async getIPFSString(cidOrURI) {
        const bytes = await IPFS.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes);
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI, and return it as a base64 encoded string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
     */
    static async getIPFSBase64(cidOrURI) {
        const bytes = await IPFS.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes, 'base64');
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
     *  
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
     */
    static async getIPFSJSON(cidOrURI) {
        const str = await IPFS.getIPFSString(cidOrURI);
        return JSON.parse(str);
    }

    //////////////////////////////////////////////
    // -------- Pinning to remote services
    //////////////////////////////////////////////

    /**
     * Request that the remote pinning service pin the given CID or ipfs URI.
     * 
     * @param {string} cidOrURI - a CID or ipfs:// URI
     * @returns {Promise<void>}
     */
    static async pin(cidOrURI) {
        const cid = IPFS.extractCID(cidOrURI);
        // Make sure IPFS is set up to use our preferred pinning service.
        await IPFS._configurePinningService();
        // Check if we've already pinned this CID to avoid a "duplicate pin" error.
        const pinned = await IPFS.isPinned(cid);
        if (pinned) return;
        // Ask the remote service to pin the content.
        // Behind the scenes, this will cause the pinning service to connect to our local IPFS node
        // and fetch the data using Bitswap, IPFS's transfer protocol.
        await IPFS_CLIENT.pin.remote.add(cid, { service: config.pinningService.name });
    }

    /**
     * Check if a cid is already pinned.
     * 
     * @param {string|CID} cid 
     * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
     */
    static async isPinned(cid) {
        if (typeof cid === 'string') {
            cid = new CID(cid);
        }
        const opts = {
            service: config.pinningService.name,
            cid: [cid], // ls expects an array of cids
        };
        if (opts.service == "local") // local daemon
            for await (const result of IPFS_CLIENT.pin.ls(opts)) {
                return true;
            }
        else // remote service
            for await (const result of IPFS_CLIENT.pin.remote.ls(opts)) {
                return true;
            }
        return false;
    }

    /**
     * Configure IPFS to use the remote pinning service from our config.
     * 
     * @private
     */
    static async _configurePinningService() {
        if (!config.pinningService) {
            throw new Error(`No pinningService set up in minty config. Unable to pin.`);
        }
        // check if the service has already been added to js-ipfs
        for (const svc of await IPFS_CLIENT.pin.remote.service.ls()) {
            if (svc.service === config.pinningService.name) {
                // service is already configured, no need to do anything
                return;
            }
        }
        // add the service to IPFS
        const { name, endpoint, key } = config.pinningService;
        if (!name) {
            throw new Error('No name configured for pinning service');
        }
        if (!endpoint) {
            throw new Error(`No endpoint configured for pinning service ${name}`);
        }
        if (!key) {
            throw new Error(`No key configured for pinning service ${name}.` +
              `If the config references an environment variable, e.g. '$$PINATA_API_TOKEN', ` + 
              `make sure that the variable is defined.`);
        }
        // skip remote if using local daemon
        if (name != "local")
            await IPFS_CLIENT.pin.remote.service.add(name, { endpoint, key });
    }

    //////////////////////////////////////////////
    // -------- URI helpers
    //////////////////////////////////////////////

    /**
     * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
     * @returns the input string with the `ipfs://` prefix stripped off
     */
    static stripIpfsUriPrefix(cidOrURI, baseUri="ipfs://") {
        // TODO
        // possibly add a check here for whether or not to strip
        if (cidOrURI.startsWith(baseUri)) {
            return cidOrURI.slice(baseUri.length);
        }
        return cidOrURI;
    }

    static ensureIpfsUriPrefix(cidOrURI, baseUri="ipfs://") {
        let uri = cidOrURI.toString()
        if (!uri.startsWith(baseUri)) {
            uri = baseUri + uri;
        }
        // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
        if (uri.startsWith(`ipfs://ipfs/`)) {
          uri = uri.replace(`ipfs://ipfs/`, `ipfs://`);
        }
        return uri;
    }

    /**
     * Return an HTTP gateway URL for the given IPFS object.
     * @param {string} ipfsURI - an ipfs:// uri or CID string
     * @returns - an HTTP url to view the IPFS object on the configured gateway.
     */
    static makeGatewayURL(ipfsURI) {
        return config.ipfsGatewayUrl + '/' + IPFS.stripIpfsUriPrefix(ipfsURI);
    }

    /**
     * 
     * @param {string} cidOrURI - an ipfs:// URI or CID string
     * @returns {CID} a CID for the root of the IPFS path
     */
    // TODO: debug
    // error messages
         // TypeError: Cannot read properties of undefined (reading 'byteOffset')
    static extractCID(cidOrURI) {
        // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
        const cidString = IPFS.stripIpfsUriPrefix(cidOrURI).split('/')[0];
        // console.log("cidString:",cidString)
        try {
            return CID.parse(cidString);
        }
        catch (err) {
            // console.error(err.message);
            return cidString;
        }
    }

    // TODO: debug
    // error messages
    static validateCIDString(possibleCIDString) {
        // console.debug("validating cid:", possibleCIDString);
        try {
            const cid = CID.parse(possibleCIDString);
            return cid;
        }
        catch (err) {
            console.error(err.message);
        }
        return false;
    }

}