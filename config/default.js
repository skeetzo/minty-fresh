const config = {

    defaultContract : "Minty",
    defaultToken: "Julip",
    defaultSymbol: "JLP",

    // these should be fetched from truffle-config
    contractPath: "src/contracts",
    buildPath: "src/client/src/contracts",

    // contract addresses
    contracts : {
        // Minty: {
            // address: '',
            // networks: {
                // development: {
                    // network_id: "*"
                // }
            // }
        // }
    },

    assetTypes: ['image'],

    // the .env variable to use to reference the path for a minty "addon"
    mintyAddonKey: "MINTY_ADDON",


            // - BUG: for some reason contract.mint won't work? so always use mintToken? as method name?
    mintFunction: "mintToken", 
    mintBatchFunction: "mintTokenBatch", 

    // The pinningService config tells minty what remote pinning service to use for pinning the IPFS data for a token.
    // The values are read in from environment variables, to discourage checking credentials into source control.
    // You can make things easy by creating a .env file with your environment variable definitions. See the example files
    // pinata.env.example and nft.storage.env.example in this directory for templates you can use to get up and running.
    pinningService: {
        name: '$$PINNING_SERVICE_NAME',
        endpoint: '$$PINNING_SERVICE_ENDPOINT',
        key: '$$PINNING_SERVICE_KEY'
    },

    // If you're running IPFS on a non-default port, update this URL. If you're using the IPFS defaults, you should be all set.
    ipfsApiUrl: 'http://localhost:5001',

    // If you're running the local IPFS gateway on a non-default port, or if you want to use a public gatway when displaying IPFS gateway urls, edit this.
    ipfsGatewayUrl: 'http://localhost:8080/ipfs',

    // key, value pairs of schemas w/ their IPFS schema .json
    schemasIPFS: {

    },

    SCHEMA_PATH: "config/schemas"
}

module.exports = config