import EthCrypto from 'eth-crypto';
import * as path from "path";
import fs from "fs";
import * as crypto from "crypto";

export const check = async (decryptedPayload, signerAddress) => {
    // checks signature
    const senderAddress = EthCrypto.recover(
        decryptedPayload.signature,
        EthCrypto.hash.keccak256(decryptedPayload.message)
    );
    console.log("sender address:", senderAddress);
    console.log("signer address:", signerAddress);
    return senderAddress == signerAddress;
}

export const encrypt = async (payload, publicKey) => {
    const encrypted = await EthCrypto.encryptWithPublicKey(publicKey.slice(2), payload);
    console.debug("encrypted:", encrypted);
    const encryptedString = EthCrypto.cipher.stringify(encrypted);
    console.debug("encryptedString:", encryptedString);
    return encryptedString;
}

export const decrypt = async (encryptedString, privateKey) => {
    encryptedString = encryptedString.replace("\"", "")
    console.log("private key:", privateKey)
    console.log("encryptedString:", encryptedString)
    // const encoder = new TextEncoder();
    // encryptedString = encoder.encode(encryptedString);
    // console.log("encryptedString:", encryptedString);
    // if (!(encryptedString instanceof Uint8Array)) {
        // console.error("incorrect public key format!");
        // return {};
    // }
    if (!privateKey) {
        console.error("missing private key!");
        return {};
    }
    const encryptedObject = EthCrypto.cipher.parse(encryptedString);
    console.log("encryptedObject:", encryptedObject);
    const decrypted = await EthCrypto.decryptWithPrivateKey(privateKey, encryptedObject);
    console.debug("decrypted:", decrypted);
    // return JSON.parse(decrypted);
    return decrypted;
}

function decryptAES(buffer, secretKey, iv) {
  const decipher = crypto.createDecipheriv('aes-256-ctr', secretKey, iv);
  const data = decipher.update(buffer)
  const decrpyted = Buffer.concat([data, decipher.final()]);
  console.log("decrpyted:", decrpyted);
  return decrpyted;
}

export function decryptRSA(toDecrypt, privkeyPath='keys/private.pem') {
  const absolutePath = path.resolve(privkeyPath)
  // console.log("absolutePath:", absolutePath)
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

export async function decryptFile(fileData, key) {
    try {
        // const ekey = decryptRSA(fileData.slice(0, 684).toString('utf8'))
        // const ekey = fileData.slice(0, 684).toString('utf8')
        const iv = fileData.slice(684, 700).toString('utf8')
        // console.debug("iv:", iv)
        const econtent = fileData.slice(700).toString('utf8')
        const ebuf = Buffer.from(econtent, 'hex')
        const content = decryptAES(ebuf, key, iv)
        console.log(' ')
        console.log('DECRYPTION --------')
        console.log('key:', key, 'iv:', iv)
        console.log('fileData:', fileData.length, 'ebuf:', ebuf.length)
        console.log('contents:', content.length)
        return content
    } catch (err) {
        console.log(err)
        throw err;
    }
}

export function getEncryptedKey(fileData) {
    const ekey = fileData.slice(0, 684).toString('utf8');
    console.log("ekey:", ekey);
    return ekey;
}