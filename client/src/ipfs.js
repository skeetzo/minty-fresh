
// ipfs.add parameters for more deterministic CIDs

class IPFS {
    
    ipfsAddOptions = {
      cidVersion: 1,
      hashAlg: 'sha2-256'
    }

    constructor(client) {
        this.client = client || null;
    }

    /**
     * Get the full contents of the IPFS object identified by the given CID or URI.
     * 
     * @param {string} cidOrURI - IPFS CID string or `ipfs://<cid>` style URI
     * @returns {Promise<Uint8Array>} - contents of the IPFS object
     */
    async getIPFS(cidOrURI) {
        const cid = stripIpfsUriPrefix(cidOrURI);
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
    // -------- URI helpers
    //////////////////////////////////////////////

    /**
     * @param {string} cidOrURI either a CID string, or a URI string of the form `ipfs://${cid}`
     * @returns the input string with the `ipfs://` prefix stripped off
     */
    static stripIpfsUriPrefix(cidOrURI) {
        // TODO
        // possibly add a check here for whether or not to strip
        if (cidOrURI.startsWith('ipfs://')) {
            return cidOrURI.slice('ipfs://'.length);
        }
        return cidOrURI;
    }

    static ensureIpfsUriPrefix(cidOrURI) {
        let uri = cidOrURI.toString()
        if (!uri.startsWith('ipfs://')) {
            uri = 'ipfs://' + cidOrURI;
        }
        // Avoid the Nyan Cat bug (https://github.com/ipfs/go-ipfs/pull/7930)
        if (uri.startsWith('ipfs://ipfs/')) {
          uri = uri.replace('ipfs://ipfs/', 'ipfs://');
        }
        return uri;
    }

    /**
     * Return an HTTP gateway URL for the given IPFS object.
     * @param {string} ipfsURI - an ipfs:// uri or CID string
     * @returns - an HTTP url to view the IPFS object on the configured gateway.
     */
    static makeGatewayURL(ipfsURI) {
        return config.ipfsGatewayUrl + '/' + stripIpfsUriPrefix(ipfsURI);
    }

    /**
     * 
     * @param {string} cidOrURI - an ipfs:// URI or CID string
     * @returns {CID} a CID for the root of the IPFS path
     */
    static extractCID(cidOrURI) {
        // remove the ipfs:// prefix, split on '/' and return first path component (root CID)
        const cidString = stripIpfsUriPrefix(cidOrURI).split('/')[0];
        return new CID(cidString);
    }

}

module.exports = IPFS;