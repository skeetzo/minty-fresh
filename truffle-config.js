
// require('dotenv').config();
// const web3 = require('web3');
// const HDWalletProvider = require('@truffle/hdwallet-provider')
// if (typeof process.env.MNEMONIC === 'undefined') throw new Error(`MNEMONIC has not been set.`);

module.exports = {
  contracts_build_directory: "./app/src/contracts",
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
     // gas: 0x1fffffffffffff,
     // gasPrice: 0,
    },
  },
  compilers: {

    solc: {
      version: "0.8.1",    // Fetch exact version from solc-bin (default: truffle's version)
      // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
      settings: {          // See the solidity docs for advice about optimization and evmVersion
        optimizer: {
          enabled: true,
          runs: 200
        },
      },
      evmVersion: "petersburg"
    }
  }

};
