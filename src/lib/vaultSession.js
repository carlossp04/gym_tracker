function draftSignature({ activeWorkout, uiDrafts }) {
  return JSON.stringify([activeWorkout, uiDrafts]);
}

/**
 * One queue per unlocked vault. Assemble each save when it reaches the front
 * so a delayed autosave always includes preceding history and routine edits.
 * @param {import('./vaultTypes.js').VaultPayload} initial
 * @param {{ revision?: number, pending?: boolean, conflict?: boolean }} metadata
 * @param {(payload: import('./vaultTypes.js').VaultPayload, revision: number) => Promise<import('./vaultTypes.js').SaveResult>} write
 * @param {(changes: Partial<import('./vaultTypes.js').VaultPayload>) => void} [onCommit]
 */
export function createVaultSession(initial, metadata, write, onCommit = () => {}) {
  let committed = initial;
  let revision = metadata.revision ?? 1;
  let draft = { activeWorkout: initial.activeWorkout ?? null, uiDrafts: initial.uiDrafts ?? {} };
  let savedSignature = metadata.pending ? null : draftSignature(draft);
  let conflict = Boolean(metadata.conflict);
  let failedPatch = null;
  let queuedWrites = 0;
  let queue = Promise.resolve();

  async function commit(changes) {
    if (conflict) throw new Error('Conflicto entre dispositivos. Descarga una copia de tus cambios antes de volver a abrir.');
    const patch = { ...failedPatch, ...changes };
    const payload = { ...committed, ...draft, ...patch };
    let result;
    try {
      result = await write(payload, revision);
    } catch (error) {
      failedPatch = patch;
      conflict = error.code === 'VAULT_CONFLICT';
      throw error;
    }
    committed = payload;
    revision = result.revision;
    savedSignature = draftSignature(payload);
    if (Object.hasOwn(patch, 'activeWorkout')) draft = { ...draft, activeWorkout: patch.activeWorkout };
    failedPatch = null;
    onCommit(patch);
    return result;
  }

  /** @param {Partial<import('./vaultTypes.js').VaultPayload>} changes */
  function save(changes = {}) {
    queuedWrites += 1;
    const task = queue.then(() => commit(changes)).finally(() => { queuedWrites -= 1; });
    queue = task.catch(() => {});
    return task;
  }

  function isDirty(currentDraft = draft) {
    return failedPatch !== null || draftSignature(currentDraft) !== savedSignature;
  }

  return {
    get isSaving() { return queuedWrites > 0; },
    get revision() { return revision; },
    get conflict() { return conflict; },
    isDirty,
    updateDraft(next) { draft = next; },
    save,
    async flush() {
      // A draft can change again while encryption or a network write is pending.
      while (true) {
        const tail = queue;
        await tail;
        if (tail !== queue) continue;
        if (conflict || !isDirty()) return;
        await save();
      }
    },
  };
}
