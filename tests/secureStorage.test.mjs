import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import { discardPendingVault, replaceEncryptedVault, createEncryptedVault, exportEncryptedVault, saveEncryptedVault, unlockEncryptedVault, unlockEncryptedVaultWithKey } from '../src/lib/secureStorage.js';

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

test('two concurrent local saves accept one revision and preserve the conflicting draft', async () => {
  values.clear();
  const { key } = await createEncryptedVault('test-password', { trainingText: '' });
  const changes = ['first', 'second'];
  const results = await Promise.allSettled(changes.map((trainingText) =>
    saveEncryptedVault(key, { trainingText }, { expectedRevision: 1 })));
  const winner = results.findIndex((result) => result.status === 'fulfilled');
  assert.ok(winner >= 0);
  assert.equal(results[1 - winner].reason?.code, 'VAULT_CONFLICT');
  const recovery = await unlockEncryptedVaultWithKey(key);
  assert.equal(recovery.conflict, true);
  assert.equal(recovery.payload.trainingText, changes[1 - winner]);
  await discardPendingVault();
  assert.equal((await unlockEncryptedVaultWithKey(key)).payload.trainingText, changes[winner]);
});

test('a damaged backup or wrong password leaves the committed vault intact', async () => {
  values.clear();
  await createEncryptedVault('test-password', { trainingText: '' });
  const original = exportEncryptedVault();
  const backup = JSON.parse(original);
  backup.ciphertext = backup.ciphertext.slice(4);
  await assert.rejects(replaceEncryptedVault(JSON.stringify(backup), undefined, 1, 'test-password'));
  await assert.rejects(replaceEncryptedVault(original, undefined, 1, 'another-password'));
  assert.equal(exportEncryptedVault(), original);
  assert.equal((await unlockEncryptedVault('test-password')).revision, 1);
});

test('an existing v1 backup restores using its own password and round-trips edits', async () => {
  values.clear();
  await createEncryptedVault('destination-password', { trainingText: '' });
  const backup = await readFile(new URL('./fixtures/vault-v1.json', import.meta.url), 'utf8');
  await replaceEncryptedVault(backup, undefined, 1, 'fixture-password');
  const restored = await unlockEncryptedVault('fixture-password');
  assert.equal(restored.revision, 2);
  assert.match(restored.payload.trainingText, /Sentadilla/);
  await saveEncryptedVault(restored.key, { ...restored.payload, uiDrafts: { profile: 'Ana' } }, { expectedRevision: 2 });
  assert.equal((await unlockEncryptedVault('fixture-password')).payload.uiDrafts.profile, 'Ana');
});
