import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'gym-tracker.encrypted-vault.v1';
const VAULT_ID_KEY = 'gym-tracker.last-vault-id.v1';
const REMEMBERED_KEYS_DB = 'gym-tracker.remembered-keys.v1';
const REMEMBERED_KEYS_STORE = 'vault-keys';
const DEFAULT_VAULT_ID = 'entrenamientos';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function hasEncryptedVault() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function isRemoteStorageEnabled() {
  return Boolean(supabase);
}

export function getSavedVaultId() {
  return localStorage.getItem(VAULT_ID_KEY) || DEFAULT_VAULT_ID;
}

export function saveVaultId(vaultId) {
  localStorage.setItem(VAULT_ID_KEY, vaultId);
}

export async function remoteVaultExists(vaultId) {
  if (!supabase) return false;
  const record = await fetchRemoteRecord(vaultId);
  return Boolean(record);
}

export async function createEncryptedVault(password, payload, vaultId) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  await saveEncryptedVault(key, payload, salt, vaultId);
  return { key, payload };
}

export async function unlockEncryptedVault(password, vaultId) {
  const record = supabase ? await fetchRemoteRecord(vaultId) : readRecord();
  if (!record) return null;
  writeLocalRecord(record);

  const salt = base64ToBytes(record.salt);
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return {
    key,
    payload: JSON.parse(decoder.decode(plaintext)),
  };
}

export async function unlockEncryptedVaultWithKey(key, vaultId) {
  const record = supabase ? await fetchRemoteRecord(vaultId) : readRecord();
  if (!record) return null;
  writeLocalRecord(record);

  return {
    key,
    payload: await decryptRecord(record, key),
  };
}

export async function saveEncryptedVault(key, payload, existingSalt, vaultId) {
  const currentRecord = readRecord();
  const salt = existingSalt || base64ToBytes(currentRecord.salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const record = {
    version: 1,
    kdf: 'PBKDF2',
    cipher: 'AES-GCM',
    iterations: 250000,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
    updatedAt: new Date().toISOString(),
  };

  writeLocalRecord(record);
  if (supabase) await upsertRemoteRecord(vaultId, record);
}

export function exportEncryptedVault() {
  return localStorage.getItem(STORAGE_KEY);
}

export async function replaceEncryptedVault(serializedVault, vaultId) {
  const parsed = JSON.parse(serializedVault);
  if (!parsed.version || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error('Archivo cifrado inválido.');
  }
  writeLocalRecord(parsed);
  if (supabase) await upsertRemoteRecord(vaultId, parsed);
}

export async function deleteEncryptedVault(vaultId) {
  localStorage.removeItem(STORAGE_KEY);
  try {
    await forgetRememberedVaultKey(vaultId);
  } catch {
    // Deleting the encrypted payload should not depend on remembered-device cleanup.
  }

  if (supabase) {
    throw new Error(`No se permite borrar vault remoto desde cliente: ${vaultId}`);
  }
}

export async function rememberVaultKey(vaultId, key) {
  const db = await openRememberedKeysDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(REMEMBERED_KEYS_STORE, 'readwrite')
      .objectStore(REMEMBERED_KEYS_STORE)
      .put({
        vaultId: normalizeVaultId(vaultId),
        key,
        updatedAt: new Date().toISOString(),
      });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getRememberedVaultKey(vaultId) {
  const db = await openRememberedKeysDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(REMEMBERED_KEYS_STORE, 'readonly')
      .objectStore(REMEMBERED_KEYS_STORE)
      .get(normalizeVaultId(vaultId));

    request.onsuccess = () => resolve(request.result?.key || null);
    request.onerror = () => reject(request.error);
  });
}

export async function forgetRememberedVaultKey(vaultId) {
  const db = await openRememberedKeysDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(REMEMBERED_KEYS_STORE, 'readwrite')
      .objectStore(REMEMBERED_KEYS_STORE)
      .delete(normalizeVaultId(vaultId));

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256',
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function decryptRecord(record, key) {
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return JSON.parse(decoder.decode(plaintext));
}

function readRecord() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function normalizeVaultId(vaultId) {
  return vaultId?.trim() || DEFAULT_VAULT_ID;
}

function openRememberedKeysDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(REMEMBERED_KEYS_DB, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(REMEMBERED_KEYS_STORE, { keyPath: 'vaultId' });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function writeLocalRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
}

async function fetchRemoteRecord(vaultId) {
  const { data, error } = await supabase
    .from('vaults')
    .select('version,kdf,cipher,iterations,salt,iv,ciphertext,updated_at')
    .eq('id', vaultId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    version: data.version,
    kdf: data.kdf,
    cipher: data.cipher,
    iterations: data.iterations,
    salt: data.salt,
    iv: data.iv,
    ciphertext: data.ciphertext,
    updatedAt: data.updated_at,
  };
}

async function upsertRemoteRecord(vaultId, record) {
  if (!vaultId?.trim()) throw new Error('Vault ID requerido.');

  const { error } = await supabase.from('vaults').upsert({
    id: vaultId.trim(),
    version: record.version,
    kdf: record.kdf,
    cipher: record.cipher,
    iterations: record.iterations,
    salt: record.salt,
    iv: record.iv,
    ciphertext: record.ciphertext,
    updated_at: record.updatedAt,
  });

  if (error) throw error;
}

function bytesToBase64(bytes) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
