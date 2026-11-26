import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { saveEncryptedVault } from './secureStorage.js';
import { createVaultSession } from './vaultSession.js';

export function useVaultPersistence(activeWorkout, uiDrafts, setStatus, setMessage, onCommit) {
  const [session, setSession] = useState(null);
  const open = useCallback((payload, key, metadata, vaultId) => {
    async function write(next, expectedRevision) {
      setStatus('saving');
      setMessage('Guardando…');
      try {
        const result = await saveEncryptedVault(key, next, { vaultId, expectedRevision });
        setStatus('success');
        setMessage('Guardado');
        return result;
      } catch (error) {
        setStatus('error');
        setMessage(error.code === 'VAULT_CONFLICT'
          ? 'Otra versión cambió. Descarga una copia desde Opciones.'
          : `${error.message || 'No se pudo guardar.'} ${error.pendingSaved ? 'Los cambios pendientes se conservan cifrados en este dispositivo.' : 'Mantén esta pestaña abierta y reintenta.'}`);
        throw error;
      }
    }
    setSession(createVaultSession(payload, metadata, write, onCommit));
  }, [onCommit, setStatus, setMessage]);

  const close = useCallback(() => setSession(null), []);

  useLayoutEffect(() => {
    session?.updateDraft({ activeWorkout, uiDrafts });
  }, [session, activeWorkout, uiDrafts]);

  useEffect(() => {
    if (!session || session.conflict || !session.isDirty()) return;
    const timer = window.setTimeout(() => session.flush().catch(() => {}), 350);
    return () => window.clearTimeout(timer);
  }, [session, activeWorkout, uiDrafts]);

  const retry = useCallback(() => { session?.flush().catch(() => {}); }, [session]);
  useEffect(() => {
    if (!session) return;
    const protect = (event) => {
      if (session.isDirty() || session.isSaving) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', protect);
    return () => {
      window.removeEventListener('online', retry);
      window.removeEventListener('beforeunload', protect);
    };
  }, [session, retry]);

  return { session, open, close, retry };
}
