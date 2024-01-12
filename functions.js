import crypto from "crypto";

export function generateRandomBytes(n) {
  return crypto.randomBytes(n).toString("base64").slice(0, n);
}

export function generateAsymmetricalKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "pkcs1", format: "pem" },
    privateKeyEncoding: { type: "pkcs1", format: "pem" },
  });

  return [publicKey, privateKey];
}

export function encodeDataByPublicKey(data, publicKey) {
  return crypto
    .publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(data, "utf-8")
    )
    .toString("base64");
}

export function decodeDataByPrivateKey(data, privateKey) {
  return crypto
    .privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(data, "base64")
    )
    .toString();
}

export function encodeDataBySessionKey(data, sessionKey) {
  const cipher = crypto.createCipheriv(
    "aes-192-ecb",
    Buffer.from(sessionKey),
    null
  );
  let encryptedData = cipher.update(data, "utf8", "hex");
  encryptedData += cipher.final("hex");

  return encryptedData;
}

export function decodeDataBySessionKey(data, sessionKey) {
  const decipher = crypto.createDecipheriv(
    "aes-192-ecb",
    Buffer.from(sessionKey),
    null
  );
  let decrypted = decipher.update(data, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

export function createHash(message) {
  const sha256Hash = crypto.createHash("sha256");

  sha256Hash.update(message, "utf-8");

  const hashedMessage = sha256Hash.digest("hex");

  return hashedMessage;
}
