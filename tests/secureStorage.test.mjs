import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncryptedVault, exportEncryptedVault, saveEncryptedVault, unlockEncryptedVault, unlockEncryptedVaultWithKey } from '../src/lib/secureStorage.js';

const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
};
const storageKey = 'gym-tracker.encrypted-vault.v1';

test('empty vaults and UI drafts round-trip encrypted, and a wrong password is rejected', async () => {
  values.clear();
  const payload = { trainingText: '', routines: [], activeWorkout: null, uiDrafts: { profile: 'Nombre privado' } };
  const created = await createEncryptedVault('test-password', payload);
  assert.equal(created.revision, 1);
  assert.equal(exportEncryptedVault().includes('Nombre privado'), false);
  assert.deepEqual((await unlockEncryptedVault('test-password')).payload, payload);
  await assert.rejects(unlockEncryptedVault('wrong-password'));
});

test('stale writes preserve an encrypted recovery copy without overwriting the current revision', async () => {
  values.clear();
  const created = await createEncryptedVault('test-password', { trainingText: '', uiDrafts: {} });
  await saveEncryptedVault(created.key, { trainingText: '', uiDrafts: { profile: 'Otra pestaña' } }, { expectedRevision: 1 });
  const committed = values.get(storageKey);
  const pending = { trainingText: '', activeWorkout: { exercises: [] }, uiDrafts: { profile: 'Cambios privados pendientes' } };
  await assert.rejects(saveEncryptedVault(created.key, pending, { expectedRevision: 1 }), { code: 'VAULT_CONFLICT' });
  assert.equal(values.get(storageKey), committed);
  assert.equal(exportEncryptedVault().includes('Cambios privados pendientes'), false);
  const recovered = await unlockEncryptedVaultWithKey(created.key);
  assert.deepEqual(recovered.payload, pending);
  assert.equal(recovered.pending, true);
  assert.equal(recovered.conflict, true);
  assert.equal(recovered.revision, 1);
});

test('successful retries remove pending recovery copies', async () => {
  values.clear();
  const created = await createEncryptedVault('test-password', { trainingText: '' });
  await saveEncryptedVault(created.key, { trainingText: '', uiDrafts: { profile: 'Guardado' } }, { expectedRevision: 1 });
  assert.equal(values.has(`${storageKey}.pending:local:entrenamientos`), false);
  assert.equal((await unlockEncryptedVaultWithKey(created.key)).revision, 2);
});
