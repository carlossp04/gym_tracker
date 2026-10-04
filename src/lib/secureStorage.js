import { createClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'gym-tracker.encrypted-vault.v1';
const VAULT_ID_KEY = 'gym-tracker.last-vault-id.v1';
const REMEMBERED_KEYS_DB = 'gym-tracker.remembered-keys.v1';
const REMEMBERED_KEYS_STORE = 'vault-keys';
const DEFAULT_VAULT_ID = 'entrenamientos';
const supabaseUrl = typeof window === 'undefined' ? undefined : import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = typeof window === 'undefined' ? undefined : import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function hasEncryptedVault() {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function isRemoteStorageEnabled() {
  return Boolean(supabase);
}

export async function getRemoteSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onRemoteAuthStateChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(session, event));
  return () => data.subscription.unsubscribe();
}

export async function signInRemoteAccount(email, password) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data.session;
}

export async function signUpRemoteAccount(email, password) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signOutRemoteAccount() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
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

export async function listRemoteVaults() {
  if (!supabase) return [];
  const user = await requireRemoteUser();
  const { data, error } = await supabase.from('vaults').select('id').eq('owner_id', user.id).order('id');
  if (error) throw error;
  return data || [];
}

export async function discardPendingVault(vaultId) {
  localStorage.removeItem(`${STORAGE_KEY}.pending:${await storageScope(vaultId)}`);
}

async function storageScope(vaultId) {
  const session = supabase ? await getRemoteSession() : null;
  return `${session?.user.id || 'local'}:${normalizeVaultId(vaultId)}`;
}

async function recordForUnlock(vaultId) {
  const scope = await storageScope(vaultId);
  if (!supabase) return { record: readRecord(), scope };
  try {
    return { record: await fetchRemoteRecord(vaultId), scope };
  } catch (error) {
    if (localStorage.getItem(`${STORAGE_KEY}.scope`) !== scope) throw error;
    const record = readRecord();
    if (!record) throw error;
    return { record, scope, offline: true };
  }
}

async function recoverPending(result, scope) {
  const raw = localStorage.getItem(`${STORAGE_KEY}.pending:${scope}`);
  if (!raw) return result;
  const pending = JSON.parse(raw);
  // A different encryption salt means this is a replaced vault, not a draft to merge.
  if (pending.salt !== readRecord()?.salt) return result;
  const payload = await decryptRecord(pending, result.key);
  return { ...result, payload, revision: pending.baseRevision, pending: true, conflict: pending.baseRevision !== result.revision };
}

export async function createEncryptedVault(password, payload, vaultId) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const metadata = await saveEncryptedVault(key, payload, {
    existingSalt: salt,
    vaultId,
    expectedRevision: null,
  });
  return { key, payload, ...metadata };
}

export async function unlockEncryptedVault(password, vaultId) {
  const { record, scope, offline } = await recordForUnlock(vaultId);
  if (!record) return null;
  writeLocalRecord(record);

  const salt = base64ToBytes(record.salt);
  const iv = base64ToBytes(record.iv);
  const ciphertext = base64ToBytes(record.ciphertext);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  localStorage.setItem(`${STORAGE_KEY}.scope`, scope);
  return recoverPending({
    key,
    payload: JSON.parse(decoder.decode(plaintext)),
    revision: normalizeRevision(record.revision),
    updatedAt: record.updatedAt,
    offline,
  }, scope);
}

export async function unlockEncryptedVaultWithKey(key, vaultId) {
  const { record, scope, offline } = await recordForUnlock(vaultId);
  if (!record) return null;
  writeLocalRecord(record);

  const payload = await decryptRecord(record, key);
  localStorage.setItem(`${STORAGE_KEY}.scope`, scope);
  return recoverPending({
    key,
    payload,
    revision: normalizeRevision(record.revision),
    updatedAt: record.updatedAt,
    offline,
  }, scope);
}

export async function saveEncryptedVault(key, payload, options = {}) {
  const { existingSalt, vaultId, expectedRevision } = options;
  const currentRecord = readRecord();
  const salt = existingSalt || (currentRecord?.salt ? base64ToBytes(currentRecord.salt) : null);
  if (!salt) throw new Error('No se encontró la sal criptográfica del vault.');

  const currentRevision = normalizeRevision(currentRecord?.revision);

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
    revision: expectedRevision == null ? 1 : expectedRevision + 1,
  };

  const scope = await storageScope(vaultId);
  const pendingKey = `${STORAGE_KEY}.pending:${scope}`;
  if (expectedRevision != null) localStorage.setItem(pendingKey, JSON.stringify({ ...record, baseRevision: expectedRevision }));
  if (!supabase && expectedRevision != null && currentRevision !== expectedRevision) {
    const error = createConflictError(); error.pendingSaved = true; throw error;
  }

  let savedRecord;
  try {
    savedRecord = supabase ? await persistRemoteRecord(vaultId, record, expectedRevision) : record;
  } catch (error) {
    error.pendingSaved = expectedRevision != null;
    throw error;
  }
  writeLocalRecord(savedRecord);
  localStorage.setItem(`${STORAGE_KEY}.scope`, scope);
  localStorage.removeItem(pendingKey);
  return { revision: savedRecord.revision, updatedAt: savedRecord.updatedAt };
}

export function exportEncryptedVault() {
  const scope = localStorage.getItem(`${STORAGE_KEY}.scope`);
  return (scope && localStorage.getItem(`${STORAGE_KEY}.pending:${scope}`)) || localStorage.getItem(STORAGE_KEY);
}

export async function replaceEncryptedVault(serializedVault, vaultId, expectedRevision) {
  const parsed = JSON.parse(serializedVault);
  if (!parsed.version || !parsed.salt || !parsed.iv || !parsed.ciphertext) {
    throw new Error('Archivo cifrado inválido.');
  }

  if (!supabase && expectedRevision != null && normalizeRevision(readRecord()?.revision) !== expectedRevision) {
    throw createConflictError();
  }

  const nextRecord = {
    ...parsed,
    updatedAt: new Date().toISOString(),
    revision: expectedRevision == null ? normalizeRevision(parsed.revision) : expectedRevision + 1,
  };
  const savedRecord = supabase
    ? await updateRemoteRecord(vaultId, nextRecord, expectedRevision)
    : nextRecord;
  writeLocalRecord(savedRecord);
  localStorage.removeItem(`${STORAGE_KEY}.pending:${await storageScope(vaultId)}`);
  return { revision: savedRecord.revision, updatedAt: savedRecord.updatedAt };
}

export async function deleteEncryptedVault(vaultId) {
  localStorage.removeItem(`${STORAGE_KEY}.pending:${await storageScope(vaultId)}`);
  localStorage.removeItem(STORAGE_KEY);
  try {
    await forgetRememberedVaultKey(vaultId);
  } catch {
    // Deleting the encrypted payload should not depend on remembered-device cleanup.
  }

  if (supabase) {
    const user = await requireRemoteUser();
    const { error } = await supabase
      .from('vaults')
      .delete()
      .eq('id', normalizeVaultId(vaultId))
      .eq('owner_id', user.id);
    if (error) throw error;
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
  const user = await requireRemoteUser();
  const { data, error } = await supabase
    .from('vaults')
    .select('version,kdf,cipher,iterations,salt,iv,ciphertext,updated_at,revision')
    .eq('id', normalizeVaultId(vaultId))
    .eq('owner_id', user.id)
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
    revision: normalizeRevision(data.revision),
  };
}

async function persistRemoteRecord(vaultId, record, expectedRevision) {
  if (expectedRevision == null) return insertRemoteRecord(vaultId, record);
  return updateRemoteRecord(vaultId, record, expectedRevision);
}

async function insertRemoteRecord(vaultId, record) {
  if (!vaultId?.trim()) throw new Error('Vault ID requerido.');
  const user = await requireRemoteUser();

  const { data, error } = await supabase.from('vaults').insert({
    id: vaultId.trim(),
    owner_id: user.id,
    version: record.version,
    kdf: record.kdf,
    cipher: record.cipher,
    iterations: record.iterations,
    salt: record.salt,
    iv: record.iv,
    ciphertext: record.ciphertext,
    updated_at: record.updatedAt,
    revision: 1,
  }).select('revision,updated_at').single();

  if (error) throw error;
  return { ...record, revision: data.revision, updatedAt: data.updated_at };
}

async function updateRemoteRecord(vaultId, record, expectedRevision) {
  if (!vaultId?.trim()) throw new Error('Vault ID requerido.');
  if (!Number.isInteger(expectedRevision) || expectedRevision < 1) throw createConflictError();
  const user = await requireRemoteUser();

  const { data, error } = await supabase
    .from('vaults')
    .update({
      version: record.version,
      kdf: record.kdf,
      cipher: record.cipher,
      iterations: record.iterations,
      salt: record.salt,
      iv: record.iv,
      ciphertext: record.ciphertext,
      updated_at: record.updatedAt,
      revision: expectedRevision + 1,
    })
    .eq('id', vaultId.trim())
    .eq('owner_id', user.id)
    .eq('revision', expectedRevision)
    .select('revision,updated_at')
    .maybeSingle();

  if (error) throw error;
  if (!data) throw createConflictError();
  return { ...record, revision: data.revision, updatedAt: data.updated_at };
}

async function requireRemoteUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Debes iniciar sesión para acceder al vault remoto.');
  return data.user;
}

function normalizeRevision(value) {
  const revision = Number(value);
  return Number.isInteger(revision) && revision > 0 ? revision : 1;
}

function createConflictError() {
  const error = new Error('El vault cambió en otro dispositivo. Bloquea y vuelve a abrir antes de guardar.');
  error.code = 'VAULT_CONFLICT';
  return error;
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
