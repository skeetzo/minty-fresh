
require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider')
if (typeof process.env.MNEMONIC === 'undefined') throw new Error(`MNEMONIC has not been set.`);

module.exports = {
  contracts_directory: "src/contracts",
  contracts_build_directory: "src/client/src/contracts",
  migrations_directory: "src/migrations",
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
     // gas: 0x1fffffffffffff,
     // gasPrice: 0,
    },
    devnet: {
      host: "d.skeetzo.com/rpc",
      port: 80,
      network_id: 69,
      gas: 8000000,
      // websocket: true        // Enable EventEmitter interface for web3 (default: false)
      provider: function() {return new HDWalletProvider(process.env.MNEMONIC, "http://d.skeetzo.com/rpc")},
    },
  },
  compilers: {
    solc: {
      version: "0.8.15",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        },
      }
    }
  }

};
