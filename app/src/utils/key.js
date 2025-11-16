import { createClient } from 'redis';

import { getContentUri } from "../contracts/ContentKing.js";
import { decryptRSA, getEncryptedKey } from "./encryption.js";
import { getFileData } from "./ipfs.js";

const redisClient = createClient();
redisClient.on('error', (err) => console.log('Redis Client Error', err));

async function connectRedis() {
	try {
		await redisClient.connect(); // Establish the connection
	}
	catch (err) {
		// console.error(err)
	}
}

export async function getKeyForId(id) {
	try {
		await connectRedis(); // Establish the connection
		const cachedKey = await redisClient.get(id+":key");
		// console.log("cached key:", cachedKey);
		if (cachedKey) return await decryptRSA(cachedKey);

		const uri = await getContentUri(id);
		// console.log("uri:", uri);
		const fileData = await getFileData(uri);
		// console.log("fileData:", fileData)

		const ekey = getEncryptedKey(fileData); 
		// console.log("ekey:", ekey)

		// cache the encrypted key
		await redisClient.set(id+":key", ekey);

		// decrypt the provided key
		const decryptedKey = await decryptRSA(ekey); // do something to decrypt the key
		console.log("decrypted key:", decryptedKey);
		
		// TODO: decide if i actually want to cache this
		await redisClient.set(id+":dkey", decryptedKey); // do i want to cache this?

		return decryptedKey;
	}
	catch (err) {
		console.error(err)
	}
	return null;
}