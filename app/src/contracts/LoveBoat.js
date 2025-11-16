import { ethers } from "ethers";
import { createClient } from 'redis';

import LoveBoatArtifact from "./LoveBoat.json" with { type: "json" };
import { getContractAddress } from "../utils/util.js";

const redisClient = createClient();

const RPC_URL = "http://127.0.0.1:8545";

// NOTE: this shouldn't need to be cached because the next step afterwards caches something that would prevent this lookup from occurring
export async function getPerformers() {
	const chainId = 1;
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const LoveBoat = new ethers.Contract(getContractAddress(chainId, "LoveBoat"), LoveBoatArtifact.abi, provider);
	const totalSupply = await LoveBoat.totalSupply();
	const performers = [];
	// for (let i=0;i<totalSupply;i++)
	return totalSupply;

	// TODO: figure out how to replace returning token ids with performer stage names

}