import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultSession } from '../src/lib/vaultSession.js';
import { encryptRecord, decryptRecord, deriveKey } from '../src/lib/vaultCrypto.js';

async function fixture() {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey('test-password', salt);
  const initial = { trainingText: '', activeWorkout: { exercises: [] }, uiDrafts: {} };
  let record = await encryptRecord(key, salt, initial, 1);
  let started;
  let release;
  const writing = new Promise((resolve) => { started = resolve; });
  const delay = new Promise((resolve) => { release = resolve; });
  let failure;
  const session = createVaultSession(initial, { revision: 1 }, async (payload, revision) => {
    started();
    await delay;
    if (failure) { const error = failure; failure = undefined; throw error; }
    assert.equal(revision, record.revision);
    record = await encryptRecord(key, salt, payload, revision + 1);
    return { revision: record.revision, updatedAt: record.updatedAt };
  });
  return { session, writing, release, reopen: () => decryptRecord(record, key),
    failNext: () => { failure = new Error('offline'); } };
}

test('locking flushes the newest edit even when an autosave is already writing', async () => {
  const { session, writing, release, reopen } = await fixture();
  session.updateDraft({ activeWorkout: { exercises: ['first'] }, uiDrafts: {} });
  const autosave = session.save();
  await writing;
  session.updateDraft({ activeWorkout: { exercises: ['edited'] }, uiDrafts: { profile: 'Ana' } });
  const lock = session.flush();
  release();
  await Promise.all([autosave, lock]);
  assert.deepEqual(await reopen(), { trainingText: '', activeWorkout: { exercises: ['edited'] }, uiDrafts: { profile: 'Ana' } });
});

test('a queued autosave preserves completed history and the explicit clearing of the session', async () => {
  const { session, writing, release, reopen } = await fixture();
  const savingRoutine = session.save({ routines: [] });
  await writing;
  const finish = session.save({ trainingText: 'completed', activeWorkout: null });
  const autosave = session.save();
  release();
  await Promise.all([savingRoutine, finish, autosave]);
  assert.deepEqual(await reopen(), { trainingText: 'completed', routines: [], activeWorkout: null, uiDrafts: {} });
});

test('retry saves the failed history change together with newer drafts', async () => {
  const { session, release, reopen, failNext } = await fixture();
  failNext();
  release();
  await assert.rejects(session.save({ trainingText: 'completed', activeWorkout: null }), /offline/);
  session.updateDraft({ activeWorkout: { exercises: [] }, uiDrafts: { profile: 'Ana' } });
  await session.flush();
  assert.deepEqual(await reopen(), { trainingText: 'completed', activeWorkout: null, uiDrafts: { profile: 'Ana' } });
});

test('flush also persists an edit made while its own write is in flight', async () => {
  const { session, writing, release, reopen } = await fixture();
  session.updateDraft({ activeWorkout: null, uiDrafts: { profile: 'Ana' } });
  const lock = session.flush();
  await writing;
  session.updateDraft({ activeWorkout: null, uiDrafts: { profile: 'Carlos' } });
  release();
  await lock;
  assert.equal((await reopen()).uiDrafts.profile, 'Carlos');
});
