import { create } from 'kubo-rpc-client'

let ipfs;

async function getIPFS() {
	if (ipfs) return ipfs;
	ipfs = await create({ 
    host: '127.0.0.1',
    port: 5001,
    protocol: 'http',
    "API": {
      "HTTPHeaders": {
          "Access-Control-Allow-Methods": [
              "PUT",
              "POST"
          ],
          "Access-Control-Allow-Origin": [
              "*"
          ]
      }
    },
  })
	return ipfs;
}

export async function getFileData(uri) {
  console.log("getting file data:", uri);
	const chunks = [];
  for await (const chunk of (await getIPFS()).get(uri))
    chunks.push(chunk);
  return Buffer.concat(chunks);
}