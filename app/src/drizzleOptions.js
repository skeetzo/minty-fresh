import Web3 from "web3";
import Minty from "./contracts/Minty.json";
import MintyPreset from "./contracts/MintyPreset.json";

const options = {
  web3: {
    block: false,
    customProvider: new Web3("ws://localhost:8545"),
  },
  contracts: [Minty, MintyPreset],
  events: {
    Minty: ["Transfer"],
    MintyPreset: ["Transfer"],
  },
};

export default options;
