
import * as fs from 'fs';
import * as path from "path";
import * as crypto from "crypto";
import { Transform } from 'stream';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE_SIZE_MINIMUM = 8000000000; // 1 GB
// const FILE_SIZE_MINIMUM = 4000000000; // 500 MB

// generateKeys()
generateDevKeys()

////////////////////////////////////////////////////////////////////////////////////////////////

class PrependTransform extends Transform {
    constructor(prependData, options) {
        super(options);
        this.prependData = Buffer.from(prependData, "utf8").toString('utf8'); // Convert to Buffer
        this.prepended = false; // Flag to ensure prepending only happens once
    }

    _transform(chunk, encoding, callback) {
        if (!this.prepended) {
            this.push(this.prependData); // Prepend the data
            this.prepended = true;
        }
        this.push(chunk); // Pass the original chunk
        callback();
    }
}

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
    console.debug(`- ${bitsToMB(stats.size).toFixed(2)} MB`);
    console.debug(`- ${bitsToGB(stats.size).toFixed(2)} GB`);
    return stats.size; // Returns the file size in bytes
  } catch (error) {
    console.error(`Error getting file size: ${error.message}`);
    return -1; // Or throw the error for handling upstream
  }
}

async function toArray(asyncIterator) { 
  const arr=[]; 
  for await(const i of asyncIterator) {
    arr.push(i); 
  }
  return arr;
}

////////////////////////////////////////////////////////////////////////////////////////////////

export async function encryptFileStream(file) {
  console.debug("encrypting file stream:", file)
  try {
    const key = crypto.randomBytes(16).toString('hex'); // 16 bytes -> 32 chars
    const iv = crypto.randomBytes(8).toString('hex');   // 8 bytes -> 16 chars
    const ekey = encryptRSA(key); // 32 chars -> 684 chars
    console.debug("ekey:", ekey);
    const prependData = Buffer.concat([ // headers: encrypted key and IV (len: 700=684+16)
      Buffer.from(ekey, 'utf8'),   // char length: 684
      Buffer.from(iv, 'utf8')     // char length: 16
    ]);
    console.log("prependData:", Buffer.from(prependData, "utf8"));
    console.log("prependData:", Buffer.from(prependData, "utf8").toString('utf8'));
    console.log(prependData)
    console.log("length:", prependData.length);
    const content = path.join(__dirname, "../../tmp/encryptions/", path.basename(file));
    console.debug("tmp path:", content);
    try { fs.unlinkSync(content) } catch (err) {}
    await new Promise(async resolve => {
      const readStream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 }); // Read in 64KB chunks
      // const readStream = fs.createReadStream(file, { encoding: 'base64'});
      // const readStream = fs.createReadStream(file, { encoding: 'base64'});
      const writeStream = fs.createWriteStream(content, {encoding: 'hex'});
      // const writeStream = fs.createWriteStream(content, {encoding: 'base64'});
      const algorithm = 'aes-256-ctr';
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const prependStream = new PrependTransform(prependData);
      // Pipe the streams: readStream -> prepend data only once -> cipher -> writeStream
      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (err) => {
        console.error('Encryption error:', err);
      });
      // readStream.pipe(prependStream).pipe(cipher).pipe(writeStream);
      readStream.pipe(cipher).pipe(writeStream);
    });

    // await prependFile(content, Buffer.from(prependData, "utf8").toString('utf8'))

    console.debug('ENCRYPTION --------')
    console.debug('key:', key, 'iv:', iv, 'ekey:', ekey.length)
    console.debug(' ')
    console.debug('file encrypted successfully!');
    getFileSizeInBytes(content);

    // await decryptFileStream(content)

    return content;
  }
  catch (err) {

  }
}

export async function encryptFile(file) {
  return await encryptFileStream(file);
  if (getFileSizeInBytes(file) >= FILE_SIZE_MINIMUM) return await encryptFileStream(file);
  console.debug("encrypting file:", file)
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
    console.log(content)
    console.debug('ENCRYPTION --------')
    console.debug('key:', key, 'iv:', iv, 'ekey:', ekey.length)
    console.debug('contents:', buff.length, 'buff:', buff.length)
    console.debug('content:', content.length, 'ebuff:', ebuff.length)
    console.debug(' ')
    return content;
  } catch (err) {
    if (err.message.includes("Cannot create a string longer than 0x1fffffe8 characters")) {
      return await encryptFileStream(file);
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
    console.debug(' ')
    console.debug('DECRYPTION --------')
    console.debug('key:', key, 'iv:', iv)
    console.debug('contents:', content.length, 'encrypted:', econtent.length)
    console.debug('downloaded:', edata.length)
    return content
  } catch (err) {
    console.debug(err)
    throw err;
  }
}


////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
export async function decryptFileStream(file) {
  console.debug("decrypting file stream:", file)
  try {
    // const key = crypto.randomBytes(16).toString('hex'); // 16 bytes -> 32 chars
    // const iv = crypto.randomBytes(8).toString('hex');   // 8 bytes -> 16 chars
    // const ekey = encryptRSA(key); // 32 chars -> 684 chars
    // console.debug("ekey:", ekey);


    const content = path.join(__dirname, "../../tmp/decryptions/", path.basename(file));
    console.debug("tmp path:", content);

    // try { fs.unlinkSync(content) } catch (err) {}
    await new Promise(async resolve => {
      const readStream = fs.createReadStream(file, { encoding: 'utf8', highWaterMark: 64 * 1024 }); // Read in 64KB chunks
      const writeStream = fs.createWriteStream(content);
      const algorithm = 'aes-256-ctr';


      // const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decipher;
      // Pipe the streams: readStream -> prepend data only once -> cipher -> writeStream
      writeStream.on('finish', () => {
        resolve();
      });
      writeStream.on('error', (err) => {
        console.error('Encryption error:', err);
      });

      const chunks = [];
      readStream.on('data', (chunk) => {
        console.log(`Received ${chunk.length} bytes of data.`);
        if (Buffer.concat(chunks).length <= 700) {
          chunks.push(chunk);
          return;
        }
        // determine decipher from first 700
        if (Buffer.concat(chunks).length >= 700 && !decipher) {
          const edata = Buffer.concat(chunks);
          const key = edata.slice(0, 684).toString('utf8');
          const iv = edata.slice(684, 700).toString('utf8');

          // rest of the data needs to continue to buffer and be decrypted at the same time
          // const econtent = edata.slice(700).toString('utf8')
          decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
          console.log("set decipher:", decipher);
          readStream.close();
        }
        // Process the chunk here
      });

      readStream.read();
      readStream.read().pipe(decipher);

      // const stream2 = fs.createReadStream(file, { start: 700 });

    });
    console.debug('ENCRYPTION --------')
    console.debug('key:', key, 'iv:', iv, 'ekey:', ekey.length)
    // console.debug('content:', content.length, 'ebuff:', ebuff.length)
    console.debug(' ')
    console.debug('file decrypted successfully!');
    getFileSizeInBytes(content);
    return content;
  }
  catch (err) {

  }
}
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////

export function encryptAES(buffer, secretKey, iv) {
  const cipher = crypto.createCipheriv('aes-256-ctr', secretKey, iv);
  const data = cipher.update(buffer);
  const encrypted = Buffer.concat([data, cipher.final()]);

  // TODO: make sure this matches whatever gets decrypted
  return encrypted.toString('hex')
  // return encrypted.toString('utf8')
}

export function decryptAES(buffer, secretKey, iv) {
  const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, iv);
  const data = decipher.update(buffer)
  const decrypted = Buffer.concat([data, decipher.final()]);
  console.debug("decrypted:", decrypted);
  return decrypted;
}

export function encryptRSA(toEncrypt, pubkeyPath='keys/dev-public.pem') {
  const absolutePath = path.resolve(pubkeyPath)
  // console.debug(absolutePath)
  const publicKey = fs.readFileSync(absolutePath, 'utf8')
  const buffer = Buffer.from(toEncrypt, 'utf8')
  const encrypted = crypto.publicEncrypt(publicKey, buffer)
  return encrypted.toString('base64')
}

export function decryptRSA(toDecrypt, privkeyPath='keys/dev-private.pem') {
  const absolutePath = path.resolve(privkeyPath)
  // console.debug(absolutePath)
  const privateKey = fs.readFileSync(absolutePath, 'utf8')
  const buffer = Buffer.from(toDecrypt, 'base64')
  const decrypted = crypto.privateDecrypt({
    key: privateKey.toString(),
    passphrase: '',
  }, buffer)
  return decrypted.toString('utf8')
}

////////////////////////////////

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

function generateDevKeys() {
  if (fs.existsSync('keys/dev-private.pem') && fs.existsSync('keys/dev-public.pem'))
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

  fs.writeFileSync('keys/dev-private.pem', privateKey)
  fs.writeFileSync('keys/dev-public.pem', publicKey)
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