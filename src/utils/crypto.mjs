
import * as fs from 'fs';
import * as path from "path";
import * as crypto from "crypto";
import { Readable, Transform, pipeline } from 'stream';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// import * as StreamPromises from "stream/promises";

// await StreamPromises.pipeline(sourceStream, destinationStream);


generateKeys()


function bitsToMB(bits) {
  // const bytes = bits / 8;
  const megabytes = bits / (1024 * 1024);
  return megabytes;
}

function bitsToGB(bits) {
  // const bytes = bits / 8;
  const gigabytes = bits / (1024 * 1024 * 1024);
  return gigabytes;
}




function getFileSizeInBytes(filePath) {
  try {
    const stats = fs.statSync(filePath);
    console.debug("file size:", stats.size);
    console.debug("- mb:", bitsToMB(stats.size));
    console.debug("- gb:", bitsToGB(stats.size));
    return stats.size; // Returns the file size in bytes
  } catch (error) {
    console.error(`Error getting file size: ${error.message}`);
    return -1; // Or throw the error for handling upstream
  }
}

async function encryptStream(file) {

  let { content } = await encryptFileStream(file);
  console.log(content)
  return { content };


  // let content;
  // await new Promise(async resolve => {
  //   await encryptFileStream(file, (c) => {
  //     content = c;
  //     resolve(); // Resolve the Promise, allowing await to continue
  //   });
  // });
  // return { content };
}

async function encryptFileStream(file) {
  console.debug("encrypting file stream:", file)
  try {
    const key = crypto.randomBytes(16).toString('hex'); // 16 bytes -> 32 chars
    const iv = crypto.randomBytes(8).toString('hex');   // 8 bytes -> 16 chars
    const ekey = encryptRSA(key); // 32 chars -> 684 chars

    const content = path.join(__dirname, "../../tmp/encryptions/", path.basename(file));
    console.log("content:", content);
    fs.unlinkSync(content);

    await new Promise(async resolve => {

      // const readableStream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 }); // Read in 64KB chunks
      const readStream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 });
      const writeStream = fs.createWriteStream(content);

      // const frontBuffer = Buffer.concat([ // headers: encrypted key and IV (len: 700=684+16)
      //   Buffer.from(ekey, 'utf8'),   // char length: 684
      //   Buffer.from(iv, 'utf8'),     // char length: 16
      // ])

      // const frontStream = new Readable();
      // frontStream.push(frontBuffer);
      // frontStream.push(null);

      const encryptionTransformer = new Transform({
        transform(chunk, encoding, callback) {
          // Perform your transformation here
          // 'chunk' is a Buffer containing the data
          // 'encoding' is the encoding of the chunk (e.g., 'utf8')
          // 'callback' is a function to call when the transformation is complete
          // console.log("transforming...")

          // Example: Convert to uppercase
          // const transformedData = chunk.toString().toUpperCase();
          const transformedData = encryptAES(chunk, key, iv);
          // console.log(chunk.length+"\n"+transformedData.length+"\n")

          // Push the transformed data to the readable side of the transform stream
          this.push(transformedData);

          // Call the callback to signal completion and allow the next chunk to be processed
          callback();
        }
      });

      readStream.pipe(encryptionTransformer).pipe(writeStream);

      writeStream.on('finish', () => {
        console.log('Piping finished: All data written to '+content);
        getFileSizeInBytes(content);
        resolve(); // Resolve the Promise, allowing await to continue
      });

    });


    // readStream.pipe(myTransformer).pipe(writeStream);

    console.debug('ENCRYPTION --------')
    console.debug('key:', key, 'iv:', iv, 'ekey:', ekey.length)
    // console.debug('contents:', buff.length, 'buff:', buff.length)
    // console.debug('content:', content.length, 'ebuff:', ebuff.length)
    console.debug(' ')

    // TODO: figure out why this is finishing early


    return { content }

    // return { content };
    // return { content };
  }
  catch (err) {

  }
}

export async function encryptFile(file) {
  console.debug("encrypting file:", file)
  const filesize = getFileSizeInBytes(file);
  // if (filesize >= 500000000) return await encryptStream(file);
  return await encryptStream(file);
  try {
    const buff = fs.readFileSync(file);
    const key = crypto.randomBytes(16).toString('hex'); // 16 bytes -> 32 chars
    const iv = crypto.randomBytes(8).toString('hex');   // 8 bytes -> 16 chars
    const ekey = encryptRSA(key); // 32 chars -> 684 chars
    const ebuff = encryptAES(buff, key, iv);
    console.debug("ekey:", ekey);

    const content = Buffer.concat([ // headers: encrypted key and IV (len: 700=684+16)
      Buffer.from(ekey, 'utf8'),   // char length: 684
      Buffer.from(iv, 'utf8'),     // char length: 16
      Buffer.from(ebuff, 'utf8')
    ])

    // console.debug(new Uint8Array(buff))
    // const content = Buffer.from(ebuff, 'utf8');
    // console.debug(content)

    console.debug('ENCRYPTION --------')
    console.debug('key:', key, 'iv:', iv, 'ekey:', ekey.length)
    console.debug('contents:', buff.length, 'buff:', buff.length)
    console.debug('content:', content.length, 'ebuff:', ebuff.length)
    console.debug(' ')
    // console.debug(content)
    // console.debug(ebuff)

    return { content };
  } catch (err) {
    if (err.message.includes("Cannot create a string longer than 0x1fffffe8 characters")) {
      return await encryptStream(file);
    }
    console.debug(err)
    throw err;
  }
}

export async function encryptFolder(folderPath) {
  // console.debug("encrypting folder:", folderPath);
  const files = fs.readdirSync(folderPath);
  const encryptedFiles = [];
  for (const file of files) {
    // console.debug("file:", file)
    encryptedFiles.push(await encryptFile(path.join(folderPath, file)));
  }
  return encryptedFiles;
}

export async function decryptFile(file_data) {
  try {    
    let edata = []
    for await (const chunk of file_data)
      edata.push(chunk)
    edata = Buffer.concat(edata)
    const key = decryptRSA(edata.slice(0, 684).toString('utf8'))
    const iv = edata.slice(684, 700).toString('utf8')
    const econtent = edata.slice(700).toString('utf8')
    const ebuf = Buffer.from(econtent, 'hex')
    const content = decryptAES(ebuf, key, iv)
    // console.debug(' ')
    // console.debug('DECRYPTION --------')
    // console.debug('key:', key, 'iv:', iv)
    // console.debug('contents:', content.length, 'encrypted:', econtent.length)
    // console.debug('downloaded:', edata.length)
    return content
  } catch (err) {
    console.debug(err)
    throw err;
  }
}

////////////////////////////////

function encryptAES(buffer, secretKey, iv) {
  const cipher = crypto.createCipheriv('aes-256-ctr', secretKey, iv);
  const data = cipher.update(buffer);
  const encrypted = Buffer.concat([data, cipher.final()]);
  // return encrypted.toString('hex')
  return encrypted.toString('utf8')
}

function decryptAES(buffer, secretKey, iv) {
  const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, iv);
  const data = decipher.update(buffer)
  const decrpyted = Buffer.concat([data, decipher.final()]);
  return decrpyted;
}

function generateKeys() {
  if (fs.existsSync('keys/private.pem') && fs.existsSync('keys/public.pem'))
    return;
  
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs1',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase: '',
    },
  })

  fs.writeFileSync('keys/private.pem', privateKey)
  fs.writeFileSync('keys/public.pem', publicKey)
}

function encryptRSA(toEncrypt, pubkeyPath='keys/public.pem') {
  const absolutePath = path.resolve(pubkeyPath)
  // console.debug(absolutePath)
  const publicKey = fs.readFileSync(absolutePath, 'utf8')
  const buffer = Buffer.from(toEncrypt, 'utf8')
  const encrypted = crypto.publicEncrypt(publicKey, buffer)
  return encrypted.toString('base64')
}

function decryptRSA(toDecrypt, privkeyPath='keys/private.pem') {
  const absolutePath = path.resolve(privkeyPath)
  // console.debug(absolutePath)
  const privateKey = fs.readFileSync(absolutePath, 'utf8')
  const buffer = Buffer.from(toDecrypt, 'base64')
  const decrypted = crypto.privateDecrypt(
  {
    key: privateKey.toString(),
    passphrase: '',
  },
  buffer,
  )
  return decrypted.toString('utf8')
}

////////////////////////////////

async function toArray(asyncIterator) { 
  const arr=[]; 
  for await(const i of asyncIterator) {
    arr.push(i); 
  }
  return arr;
}

////////////////////////////////////////////////////////////////////////////////////////////////

import EthCrypto from 'eth-crypto';

export const checkSigner = async (decryptedPayload, signerAddress) => {
    // checks signature
    const senderAddress = EthCrypto.recover(
        decryptedPayload.signature,
        EthCrypto.hash.keccak256(decryptedPayload.message)
    );
    console.debug("sender address:", senderAddress);
    console.debug("signer address:", signerAddress);
    return senderAddress == signerAddress;
}

export const encryptPublicKey = async (payload, publicKey) => {
    const encrypted = await EthCrypto.encryptWithPublicKey(publicKey.slice(2), payload);
    console.debug("encrypted:", encrypted);
    const encryptedString = EthCrypto.cipher.stringify(encrypted);
    console.debug("encryptedString:", encryptedString);
    return encryptedString;
}

export const decryptString = async (encryptedString, privateKey) => {
    if (!(encryptedString instanceof Uint8Array)) {
        console.error("incorrect public key format!");
        return {};
    }
    if (!privateKey) {
        console.error("missing private key!");
        return {};
    }
    console.debug("private key:", privateKey)
    console.debug("encryptedString:", encryptedString)
    const encryptedObject = EthCrypto.cipher.parse(encryptedString.replace("\"", ""));
    console.debug("encryptedObject:", encryptedObject);
    const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, encryptedObject);
    console.debug("decrypted:", decrypted);
    return JSON.parse(decrypted);
}