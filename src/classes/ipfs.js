const ipfsClient = require('ipfs-http-client');
const CID = require('cids');
const all = require('it-all');

const uint8ArrayConcat = require('uint8arrays/concat').concat;
const uint8ArrayToString = require('uint8arrays/to-string').toString;

// ipfs.add parameters for more deterministic CIDs

class IPFS {
    
    ipfsAddOptions = {
      cidVersion: 1,
      hashAlg: 'sha2-256'
    }

    constructor(opts={}) {
        this.client = opts.client || ipfsClient(opts.ipfsApiUrl) || ipfsClient(config.ipfsApiUrl);
        this.prefix = "ipfs" || opts.prefix;
    }

    async add(ipfsPath, content) {
        const { cid: metadataCID } = await this.client.add({ path: ipfsPath, content}, IPFS.ipfsAddOptions);
        const metadataURI = IPFS.ensureIpfsUriPrefix(metadataCID) + ipfsPath;
        return { metadataCID, metadataURI };
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<Uint8Array>} - contents of the IPFS object
     */
    async getIPFS(cidOrURI) {
        const cid = IPFS.stripIpfsUriPrefix(cidOrURI);
        return uint8ArrayConcat(await all(this.client.cat(cid)));
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and return it as a string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - the contents of the IPFS object as a string
     */
    async getIPFSString(cidOrURI) {
        const bytes = await this.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes);
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI, and return it as a base64 encoded string.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, encoded to base64
     */
    async getIPFSBase64(cidOrURI) {
        const bytes = await this.getIPFS(cidOrURI);
        return uint8ArrayToString(bytes, 'base64');
    }

    /**
     * Get the contents of the IPFS object identified by the given CID or URI, and parse it as JSON, returning the parsed object.
     *  
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<string>} - contents of the IPFS object, as a javascript object (or array, etc depending on what was stored). Fails if the content isn't valid JSON.
     */
    async getIPFSJSON(cidOrURI) {
        const str = await this.getIPFSString(cidOrURI);
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
    async pin(cidOrURI) {
        const cid = IPFS.extractCID(cidOrURI);
        // Make sure IPFS is set up to use our preferred pinning service.
        await this._configurePinningService();
        // Check if we've already pinned this CID to avoid a "duplicate pin" error.
        const pinned = await this.isPinned(cid);
        if (pinned) return;
        // Ask the remote service to pin the content.
        // Behind the scenes, this will cause the pinning service to connect to our local IPFS node
        // and fetch the data using Bitswap, IPFS's transfer protocol.
        await this.client.pin.remote.add(cid, { service: config.pinningService.name });
    }

    /**
     * Check if a cid is already pinned.
     * 
     * @param {string|CID} cid 
     * @returns {Promise<boolean>} - true if the pinning service has already pinned the given cid
     */
    async isPinned(cid) {
        if (typeof cid === 'string') {
            cid = new CID(cid);
        }
        const opts = {
            service: config.pinningService.name,
            cid: [cid], // ls expects an array of cids
        };
        for await (const result of this.client.pin.remote.ls(opts)) {
            return true;
        }
        return false;
    }

    /**
     * Configure IPFS to use the remote pinning service from our config.
     * 
     * @private
     */
    async _configurePinningService() {
        if (!config.pinningService) {
            throw new Error(`No pinningService set up in minty config. Unable to pin.`);
        }

        // check if the service has already been added to js-ipfs
        for (const svc of await this.client.pin.remote.service.ls()) {
            if (svc.service === config.pinningService.name) {
                // service is already configured, no need to do anything
                return;
            }
        }

        // add the service to IPFS
        const { name, endpoint, key } = config.pinningService
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
        await this.client.pin.remote.service.add(name, { endpoint, key });
    }

    //////////////////////////////////////////////
    // -------- URI helpers
    //////////////////////////////////////////////

    /**
     * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
     * @returns the input string with the `ipfs://` prefix stripped off
     */
    static stripIpfsUriPrefix(cidOrURI) {
        // TODO
        // possibly add a check here for whether or not to strip
        if (cidOrURI.startsWith(`ipfs://`)) {
            return cidOrURI.slice(`ipfs://`.length);
        }
        return cidOrURI;
    }

    static ensureIpfsUriPrefix(cidOrURI) {
        let uri = cidOrURI.toString()
        if (!uri.startsWith(`ipfs://`)) {
            uri = `ipfs://` + cidOrURI;
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
    static extractCID(cidOrURI) {
        // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
        const cidString = IPFS.stripIpfsUriPrefix(cidOrURI).split('/')[0];
        return new CID(cidString);
    }

    static validateCIDString(possibleCIDString) {
        // console.debug("validating cid:", possibleCIDString);
        try {
            const cid = new CID(possibleCIDString);
            return CID.isCID(cid);
        }
        catch (err) {
            // console.error(err.message);
        }
        return false;
    }

}

module.exports = IPFS;