const iterations = 250000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function decryptRecord(record, key) {
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(decoder.decode(plaintext));
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function encryptRecord(key, salt, payload, revision) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  return {
    version: 1,
    kdf: 'PBKDF2',
    cipher: 'AES-GCM',
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString(),
    revision,
  };
}

export async function openBackup(serialized, password) {
  const record = JSON.parse(serialized);
  if (record?.version !== 1 || record.kdf !== 'PBKDF2' || record.cipher !== 'AES-GCM' ||
      record.iterations !== iterations || typeof record.salt !== 'string' ||
      typeof record.iv !== 'string' || typeof record.ciphertext !== 'string') {
    throw new Error('Archivo cifrado inválido.');
  }
  const salt = base64ToBytes(record.salt);
  if (salt.length !== 16 || base64ToBytes(record.iv).length !== 12) {
    throw new Error('Archivo cifrado inválido.');
  }
  const key = await deriveKey(password, salt);
  const payload = await decryptRecord(record, key);
  return { record, key, salt, payload };
}
