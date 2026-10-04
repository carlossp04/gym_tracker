import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { initialTrainingText, userColors } from './constants/appConstants';
import AuthScreen from './features/auth/AuthScreen';
import AppHeader from './features/layout/AppHeader';
import TabNav from './features/layout/TabNav';
import ProgressTab from './features/progress/ProgressTab';
import CalendarTab from './features/calendar/CalendarTab';
import ExercisesTab from './features/exercises/ExercisesTab';
import AiResumeTab from './features/ai/AiResumeTab';
import GeneralComparisonTab from './features/general/GeneralComparisonTab';
import MergeExerciseModal from './features/exercises/MergeExerciseModal';
import RenameExerciseModal from './features/exercises/RenameExerciseModal';
import TrainingEditModal from './features/training/TrainingEditModal';
import TrainingInputPanel from './features/training/TrainingInputPanel';
import TrainingRecordsTab from './features/training/TrainingRecordsTab';
import TodayTab from './features/training/TodayTab';
import { inspectTrainingImport, routineFromEntries, todayInputValue, workoutFromEntries } from './lib/workoutFlow';
import ActiveWorkoutPanel from './features/routines/ActiveWorkoutPanel';
import RoutinesTab from './features/routines/RoutinesTab';
import {
  applyEntryEdits,
  applyExerciseAliases,
  getAllUniqueExercises,
  getAvailableUsers,
  getComparisonChartData,
  getGeneralComparisonChartData,
  getGeneralUserSummaries,
  getProgressChartData,
  getStats,
  getUserExercises,
  getWeeklyVolumeChartData,
} from './lib/gymMetrics';
import {
  createEncryptedVault,
  deleteEncryptedVault,
  discardPendingVault,
  exportEncryptedVault,
  forgetRememberedVaultKey,
  getRemoteSession,
  getRememberedVaultKey,
  getSavedVaultId,
  hasEncryptedVault,
  isRemoteStorageEnabled,
  listRemoteVaults,
  onRemoteAuthStateChange,
  rememberVaultKey,
  replaceEncryptedVault,
  remoteVaultExists,
  saveEncryptedVault,
  saveVaultId,
  signInRemoteAccount,
  signOutRemoteAccount,
  signUpRemoteAccount,
  unlockEncryptedVault,
  unlockEncryptedVaultWithKey,
} from './lib/secureStorage';
import { normalizeChatText, parseWhatsAppChat, validateParsedData } from './lib/whatsappParser';

const ALL_USERS_OPTION = 'Todos los usuarios';

export default function GymTracker() {
  const [trainingText, setTrainingText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultId, setVaultId] = useState(() => getSavedVaultId());
  const [initialAutoUnlockVaultId] = useState(() => getSavedVaultId());
  const [isRemoteStorage] = useState(() => isRemoteStorageEnabled());
  const [remoteSession, setRemoteSession] = useState(null);
  const [isRemoteAuthReady, setIsRemoteAuthReady] = useState(() => !isRemoteStorageEnabled());
  const [accountEmail, setAccountEmail] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountMode, setAccountMode] = useState('signin');
  const [accountStatus, setAccountStatus] = useState('idle');
  const [accountMessage, setAccountMessage] = useState('');
  const [hasVault, setHasVault] = useState(() => hasEncryptedVault());
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isCheckingRememberedDevice, setIsCheckingRememberedDevice] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [newTrainingText, setNewTrainingText] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const revisionRef = useRef(null);
  const saveQueue = useRef(Promise.resolve());
  const committedPayloadRef = useRef({});
  const liveDraftRef = useRef({ activeWorkout: null, uiDrafts: {} });
  const savedDraftRef = useRef('');
  const conflictRef = useRef(false);
  const restoringRef = useRef(false);
  const [uiDrafts, setUiDrafts] = useState({});
  const [retrySave, setRetrySave] = useState(0);
  const [completedWorkout, setCompletedWorkout] = useState(null);
  const [remoteVaults, setRemoteVaults] = useState([]);
  const [vaultListMessage, setVaultListMessage] = useState('');
  const [includeDemo, setIncludeDemo] = useState(false);
  const [recordsOrigin, setRecordsOrigin] = useState(null);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [progressWeightMode, setProgressWeightMode] = useState('average');
  const [activeTab, setActiveTab] = useState('today');

  const [aliases, setAliases] = useState({});
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeNameInput, setMergeNameInput] = useState('');
  const [renamingExercise, setRenamingExercise] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [entryEdits, setEntryEdits] = useState({});
  const [deletedEntryIds, setDeletedEntryIds] = useState({});
  const [editingEntry, setEditingEntry] = useState(null);
  const [bulkEditingEntries, setBulkEditingEntries] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [bulkEditFields, setBulkEditFields] = useState(() => getEmptyBulkEditFields());
  const [recordsFocus, setRecordsFocus] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const canEdit = true;
  const remoteUser = remoteSession?.user || null;

  const editedData = useMemo(
    () => applyEntryEdits(parsedData, entryEdits, deletedEntryIds),
    [parsedData, entryEdits, deletedEntryIds],
  );
  const processedData = useMemo(() => applyExerciseAliases(editedData, aliases), [editedData, aliases]);
  const availableUsers = useMemo(() => getAvailableUsers(processedData), [processedData]);
  const progressUserOptions = useMemo(() => [ALL_USERS_OPTION, ...availableUsers], [availableUsers]);
  const allUniqueExercises = useMemo(() => getAllUniqueExercises(processedData), [processedData]);
  const trainingEntries = useMemo(() => getEditableTrainingEntries(processedData), [processedData]);
  const uniqueUserExercises = useMemo(() => getUserExercises(processedData, selectedUser), [processedData, selectedUser]);
  const isAllUsersSelected = selectedUser === ALL_USERS_OPTION;
  const progressExerciseOptions = isAllUsersSelected ? allUniqueExercises : uniqueUserExercises;
  const userChartData = useMemo(() => getProgressChartData(processedData, selectedUser, selectedExercise, progressWeightMode), [processedData, selectedUser, selectedExercise, progressWeightMode]);
  const multiUserChartData = useMemo(() => getComparisonChartData(processedData, selectedExercise, progressWeightMode), [processedData, selectedExercise, progressWeightMode]);
  const chartData = isAllUsersSelected ? multiUserChartData : userChartData;
  const generalComparisonData = useMemo(() => getGeneralComparisonChartData(processedData), [processedData]);
  const weeklyVolumeData = useMemo(() => getWeeklyVolumeChartData(processedData), [processedData]);
  const generalUserSummaries = useMemo(() => getGeneralUserSummaries(processedData), [processedData]);
  const stats = useMemo(() => getStats(userChartData), [userChartData]);

  useEffect(() => {
    if (availableUsers.length > 0 && !selectedUser) {
      setSelectedUser(availableUsers[0]);
    }
  }, [availableUsers, selectedUser]);

  useEffect(() => {
    if (progressExerciseOptions.length > 0 && (!selectedExercise || !progressExerciseOptions.includes(selectedExercise))) {
      setSelectedExercise(progressExerciseOptions[0]);
    }
  }, [progressExerciseOptions, selectedExercise]);

  const loadTrainingPayload = useCallback((payload, key, metadata = {}) => {
    const cleanText = normalizeChatText(payload.trainingText || '');
    const parsed = parseWhatsAppChat(cleanText);
    const { isValid } = validateParsedData(parsed);

    if (cleanText.trim() && !isValid) {
      throw new Error('Datos desencriptados sin entrenamientos válidos.');
    }

    setTrainingText(cleanText);
    setParsedData(parsed);
    setAliases(payload.aliases || {});
    setEntryEdits(payload.entryEdits || {});
    setDeletedEntryIds(payload.deletedEntryIds || {});
    setRoutines(Array.isArray(payload.routines) ? payload.routines : []);
    setActiveWorkout(payload.activeWorkout?.exercises ? payload.activeWorkout : null);
    setUiDrafts(payload.uiDrafts || {});
    setNewTrainingText(payload.uiDrafts?.pasteText || '');
    setSelectedUser(payload.uiDrafts?.profile || '');
    setSelectedExercise(payload.uiDrafts?.progressExercise || '');
    setProgressWeightMode(payload.uiDrafts?.weightMode || 'average');
    committedPayloadRef.current = { ...payload, trainingText: cleanText, aliases: payload.aliases || {}, entryEdits: payload.entryEdits || {}, deletedEntryIds: payload.deletedEntryIds || {}, routines: payload.routines || [], activeWorkout: payload.activeWorkout || null, uiDrafts: payload.uiDrafts || {} };
    liveDraftRef.current = { activeWorkout: payload.activeWorkout || null, uiDrafts: payload.uiDrafts || {} };
    savedDraftRef.current = metadata.pending ? '' : JSON.stringify([payload.activeWorkout?.exercises ? payload.activeWorkout : null, payload.uiDrafts || {}]);
    conflictRef.current = Boolean(metadata.conflict);
    setCryptoKey(key);
    revisionRef.current = metadata.revision ?? 1;
    setIsUnlocked(true);
    setAuthError('');
    setSaveStatus(metadata.pending ? 'error' : 'idle');
    setSaveMessage(metadata.conflict ? 'Hay cambios pendientes y otra versión en la nube. Descarga una copia antes de volver a abrir; no se sobrescribirá la otra versión.' : metadata.pending ? 'Cambios recuperados en este dispositivo. Pendientes de sincronizar.' : '');
  }, []);

  const clearUnlockedState = useCallback(() => {
    setIsUnlocked(false);
    setCryptoKey(null);
    revisionRef.current = null;
    setParsedData(null);
    setTrainingText('');
    setAliases({});
    setEntryEdits({});
    setDeletedEntryIds({});
    setRoutines([]);
    setActiveWorkout(null);
    setSelectedForMerge([]);
    setNewTrainingText('');
    setEditingEntry(null);
    setBulkEditingEntries([]);
    setEditForm(null);
    setBulkEditFields(getEmptyBulkEditFields());
    setRecordsFocus(null);
    setPassword('');
    setRememberDevice(false);
    setUiDrafts({});
    setCompletedWorkout(null);
    setRecordsOrigin(null);
    setActiveTab('today');
  }, []);

  useEffect(() => {
    if (!isRemoteStorage || !remoteUser) return;
    let cancelled = false;
    listRemoteVaults().then((items) => {
      if (!cancelled) { setRemoteVaults(items); setVaultId((current) => items.length && !items.some((item) => item.id === current) ? items[0].id : current); }
    }).catch(() => {
      if (!cancelled) setVaultListMessage('No se pudieron cargar tus espacios. Puedes introducir el nombre manualmente.');
    });
    return () => { cancelled = true; };
  }, [isRemoteStorage, remoteUser]);

  useEffect(() => {
    if (!isRemoteStorage) return undefined;
    let isCancelled = false;

    getRemoteSession()
      .then((session) => {
        if (!isCancelled) setRemoteSession(session);
      })
      .catch(() => {
        if (!isCancelled) setAccountMessage('No se pudo comprobar la sesión de Supabase.');
      })
      .finally(() => {
        if (!isCancelled) setIsRemoteAuthReady(true);
      });

    const unsubscribe = onRemoteAuthStateChange((session, event) => {
      if (!isCancelled) {
        setRemoteSession(session);
        setIsRemoteAuthReady(true);
        if (!session && event === 'SIGNED_OUT') clearUnlockedState();
      }
    });

    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [clearUnlockedState, isRemoteStorage]);

  useEffect(() => {
    let isCancelled = false;

    const unlockRememberedDevice = async () => {
      const cleanVaultId = initialAutoUnlockVaultId.trim();

      if (isRemoteStorage && (!isRemoteAuthReady || !remoteUser)) {
        if (isRemoteAuthReady) setIsCheckingRememberedDevice(false);
        return;
      }

      try {
        setIsCheckingRememberedDevice(true);
        const rememberedKeyId = getRememberedKeyId(cleanVaultId, remoteUser?.id);
        const rememberedKey = await getRememberedVaultKey(rememberedKeyId);
        if (!rememberedKey || isCancelled) return;

        setIsUnlocking(true);
        const result = await unlockEncryptedVaultWithKey(rememberedKey, cleanVaultId);
        if (!result || isCancelled) return;

        loadTrainingPayload(result.payload, result.key, result);
        setRememberDevice(true);
      } catch {
        try {
          await forgetRememberedVaultKey(getRememberedKeyId(cleanVaultId, remoteUser?.id));
        } catch {
          // Ignore cleanup errors; the normal password flow remains available.
        }
      } finally {
        if (!isCancelled) {
          setIsUnlocking(false);
          setIsCheckingRememberedDevice(false);
        }
      }
    };

    unlockRememberedDevice();

    return () => {
      isCancelled = true;
    };
  }, [initialAutoUnlockVaultId, isRemoteAuthReady, isRemoteStorage, loadTrainingPayload, remoteUser]);

  const rememberCurrentVaultKey = async (cleanVaultId, key) => {
    if (!rememberDevice) return;

    try {
      await rememberVaultKey(getRememberedKeyId(cleanVaultId, remoteUser?.id), key);
    } catch {
      // Remembering the device is optional; successful password unlock should still proceed.
    }
  };

  const handleRemoteAccountSubmit = async (event) => {
    event.preventDefault();
    if (!accountEmail.trim() || accountPassword.length < 8) return;

    setAccountStatus('loading');
    setAccountMessage('');

    try {
      if (accountMode === 'signup') {
        const result = await signUpRemoteAccount(accountEmail, accountPassword);
        if (!result.session) {
          setAccountStatus('success');
          setAccountMessage('Cuenta creada. Confirma el correo y después inicia sesión.');
          setAccountMode('signin');
          return;
        }
        setRemoteSession(result.session);
        setAccountMessage('Cuenta creada correctamente.');
      } else {
        const session = await signInRemoteAccount(accountEmail, accountPassword);
        setRemoteSession(session);
      }

      setAccountPassword('');
      setAccountStatus('success');
    } catch (error) {
      setAccountStatus('error');
      setAccountMessage(error.message || 'No se pudo autenticar la cuenta.');
    }
  };

  const handleRemoteSignOut = async () => {
    try {
      if (!(await lockApp())) return;
      await signOutRemoteAccount();
      setRemoteSession(null);
      setAccountStatus('idle');
      setAccountMessage('');
    } catch (error) {
      setAccountStatus('error');
      setAccountMessage(error.message || 'No se pudo cerrar la sesión.');
    }
  };

  const handleUnlock = async (event) => {
    event.preventDefault();
    if (password.length < 6) return;

    setIsUnlocking(true);
    setAuthError('');

    try {
      const cleanVaultId = vaultId.trim();
      saveVaultId(cleanVaultId);

      if (isRemoteStorage) {
        const result = await unlockEncryptedVault(password, cleanVaultId);
        if (!result) { setAuthError('No existe ningún espacio con ese nombre. Puedes crear uno nuevo.'); return; }
        const { key, payload } = result;
        await rememberCurrentVaultKey(cleanVaultId, key);
        loadTrainingPayload(payload, key, result);
      } else if (hasVault) {
        const result = await unlockEncryptedVault(password);
        const { key, payload } = result;
        await rememberCurrentVaultKey(cleanVaultId, key);
        loadTrainingPayload(payload, key, result);
      } else {
        const payload = {
          trainingText: includeDemo ? normalizeChatText(initialTrainingText) : '',
          aliases: {},
          entryEdits: {},
          deletedEntryIds: {},
          routines: [],
          activeWorkout: null,
        };
        const result = await createEncryptedVault(password, payload);
        const { key } = result;
        await rememberCurrentVaultKey(cleanVaultId, key);
        setHasVault(true);
        loadTrainingPayload(payload, key, result);
      }
    } catch {
      setAuthError('Contraseña incorrecta o datos cifrados corruptos.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const createRemoteVault = async () => {
    if (!isRemoteStorage || !remoteUser || password.length < 6 || !vaultId.trim()) return;

    try {
      setIsUnlocking(true);
      setAuthError('');
      const cleanVaultId = vaultId.trim();
      saveVaultId(cleanVaultId);
      if (await remoteVaultExists(cleanVaultId)) {
        setAuthError('Ya existe un vault con ese ID en tu cuenta.');
        return;
      }

      const payload = {
        trainingText: includeDemo ? normalizeChatText(initialTrainingText) : '',
        aliases: {},
        entryEdits: {},
        deletedEntryIds: {},
        routines: [],
        activeWorkout: null,
      };
      const result = await createEncryptedVault(password, payload, cleanVaultId);
      setRemoteVaults((current) => [...current.filter((space) => space.id !== cleanVaultId), { id: cleanVaultId }]);
      await rememberCurrentVaultKey(cleanVaultId, result.key);
      loadTrainingPayload(payload, result.key, result);
    } catch (error) {
      setAuthError(error.message || 'No se pudo crear el vault remoto.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const resetVaultToInitialSeed = async () => {
    const shouldReset = window.confirm('Se borrarán los entrenamientos locales. Podrás empezar de nuevo con otra contraseña. ¿Continuar?');
    if (!shouldReset) return;

    try {
      await deleteEncryptedVault(vaultId.trim());
      await lockApp();
      setHasVault(false);
      setAuthError('Datos borrados. Crea una contraseña para empezar de nuevo.');
    } catch {
      setAuthError('No se pudo borrar el vault remoto.');
    }
  };

  const parseAndValidateTrainingText = (text) => {
    const cleanText = normalizeChatText(text);
    const parsed = parseWhatsAppChat(cleanText);
    const { isValid } = validateParsedData(parsed);

    if (!isValid) {
      throw new Error('El texto no contiene datos válidos.');
    }

    return { cleanText, parsed };
  };

  const persistPayload = useCallback(async (
    nextTrainingText,
    nextAliases,
    nextEntryEdits = entryEdits,
    nextDeletedEntryIds = deletedEntryIds,
    nextRoutines = routines,
    nextActiveWorkout = activeWorkout,
  ) => {
    const patch = {};
    // Merge only deliberate changes at execution time. An autosave queued during
    // a routine/history save must not put an older snapshot back into the vault.
    if (nextTrainingText !== trainingText) patch.trainingText = nextTrainingText;
    if (nextAliases !== aliases) patch.aliases = nextAliases;
    if (nextEntryEdits !== entryEdits) patch.entryEdits = nextEntryEdits;
    if (nextDeletedEntryIds !== deletedEntryIds) patch.deletedEntryIds = nextDeletedEntryIds;
    if (nextRoutines !== routines) patch.routines = nextRoutines;
    if (nextActiveWorkout !== activeWorkout) patch.activeWorkout = nextActiveWorkout;
    const task = saveQueue.current.catch(() => {}).then(async () => {
      if (conflictRef.current) {
        const message = 'Conflicto entre dispositivos. Descarga una copia de tus cambios antes de volver a abrir.';
        setSaveStatus('error'); setSaveMessage(message); throw new Error(message);
      }
      setSaveStatus('saving');
      setSaveMessage('Guardando…');
      try {
      const payload = { ...committedPayloadRef.current, ...liveDraftRef.current, ...patch };
      const metadata = await saveEncryptedVault(cryptoKey, payload, {
        vaultId: vaultId.trim(),
        expectedRevision: revisionRef.current,
      });
      revisionRef.current = metadata.revision;
      committedPayloadRef.current = payload;
      if (Object.hasOwn(patch, 'activeWorkout')) liveDraftRef.current = { ...liveDraftRef.current, activeWorkout: patch.activeWorkout };
      savedDraftRef.current = JSON.stringify([payload.activeWorkout, payload.uiDrafts]);
      setSaveStatus('success');
      setSaveMessage('Guardado');
      return metadata;
    } catch (error) {
      if (error.code === 'VAULT_CONFLICT') conflictRef.current = true;
      setSaveStatus('error');
      setSaveMessage(error.code === 'VAULT_CONFLICT' ? 'Otra versión cambió. Tus cambios están guardados cifrados en este dispositivo; descarga una copia desde Opciones.' : `${error.message || 'No se pudo guardar.'} ${error.pendingSaved ? 'Los cambios pendientes se conservan cifrados en este dispositivo.' : 'No se ha podido confirmar una copia local de estos cambios. Mantén esta pestaña abierta y reintenta.'}`);
      throw error;
    }
    });
    saveQueue.current = task;
    return task;
  }, [activeWorkout, aliases, cryptoKey, deletedEntryIds, entryEdits, routines, trainingText, vaultId]);

  useEffect(() => {
    liveDraftRef.current = { activeWorkout, uiDrafts };
  }, [activeWorkout, uiDrafts]);

  const draftSignature = JSON.stringify([activeWorkout, uiDrafts]);
  useEffect(() => {
    if (!isUnlocked || !cryptoKey || conflictRef.current || draftSignature === savedDraftRef.current) return;
    const timer = window.setTimeout(() => {
      if (restoringRef.current) return;
      persistPayload(trainingText, aliases).catch(() => {});
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draftSignature, isUnlocked, cryptoKey, persistPayload, trainingText, aliases, retrySave]);

  useEffect(() => {
    const retry = () => setRetrySave((value) => value + 1);
    const protect = (event) => {
      if (isUnlocked && draftSignature !== savedDraftRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('online', retry);
    window.addEventListener('beforeunload', protect);
    return () => { window.removeEventListener('online', retry); window.removeEventListener('beforeunload', protect); };
  }, [isUnlocked, draftSignature]);

  const changeDraft = (key, value) => {
    if (conflictRef.current) return;
    setUiDrafts((current) => {
      const next = { ...current, [key]: value };
      if (value === undefined) delete next[key];
      return next;
    });
    setSaveStatus('pending');
    setSaveMessage('Cambios pendientes de guardar…');
  };

  const changeWorkout = (workout) => {
    if (conflictRef.current) return;
    setActiveWorkout(workout);
    setSaveStatus('pending');
    setSaveMessage('Cambios pendientes de guardar…');
  };

  const appendTraining = async () => {
    const preview = inspectTrainingImport(newTrainingText, parsedData);
    if (preview.entries.length === 0) { setSaveStatus('error'); setSaveMessage('No se ha detectado ningún registro nuevo. Revisa el formato del bloque.'); return; }
    if ((preview.duplicates || preview.unrecognized) && !window.confirm(`Se detectan ${preview.duplicates} posibles duplicados y ${preview.unrecognized} líneas de series no reconocidas. ¿Importar los registros detectados?`)) return;
    const wasSaved = await appendTrainingBlock(newTrainingText, `${preview.entries.length} registros importados.`, preview.entries.length);
    if (wasSaved) { setNewTrainingText(''); changeDraft('pasteText', ''); }
  };

  const appendManualWorkout = async (workout) => {
    const block = buildManualWorkoutText(workout);
    const saved = await appendTrainingBlock(
      block,
      'Entrenamiento guardado.',
      workout.entries.length,
    );
    if (saved) setCompletedWorkout({ sessionName: workout.dayLabel, user: workout.user, date: workout.date, completedEntries: workout.entries });
    return saved;
  };

  const appendTrainingBlock = async (
    block,
    successMessage,
    expectedAddedEntries = null,
    nextActiveWorkout = activeWorkout,
  ) => {
    if (!canEdit || !block.trim() || !cryptoKey) return false;

    try {
      setSaveStatus('saving');
      setSaveMessage('');

      const nextText = `${trainingText.trim()}\n${normalizeChatText(block.trim())}`;
      const { cleanText, parsed } = parseAndValidateTrainingText(nextText);

      if (expectedAddedEntries != null) {
        const previousEntryCount = countParsedEntries(parsedData);
        const nextEntryCount = countParsedEntries(parsed);
        if (nextEntryCount - previousEntryCount !== expectedAddedEntries) {
          throw new Error('Algún ejercicio no tiene un formato compatible. Revisa su nombre y los valores introducidos.');
        }
      }

      await persistPayload(cleanText, aliases, entryEdits, deletedEntryIds, routines, nextActiveWorkout);
      setTrainingText(cleanText);
      setParsedData(parsed);
      setSaveStatus('success');
      setSaveMessage(successMessage);
      return true;
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo añadir el entreno.');
      return false;
    }
  };

  const saveRoutines = async (nextRoutines) => {
    try {
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, nextRoutines, activeWorkout);
      setRoutines(nextRoutines);
      setSaveMessage('Rutina guardada.');
      return true;
    } catch {
      return false;
    }
  };

  const repeatWorkout = async (entries) => {
    if (activeWorkout) { setActiveTab('training'); return; }
    const workout = workoutFromEntries(entries, entries[0].user);
    try {
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, routines, workout);
      setActiveWorkout(workout); setCompletedWorkout(null); setActiveTab('training');
    } catch { /* Global save feedback explains the failure. */ }
  };

  const saveWorkoutAsRoutine = async (entries) => {
    const baseName = `${entries[0].dayLabel} (${entries[0].date})`;
    let name = baseName;
    let suffix = 2;
    while (routines.some((routine) => routine.name === name)) name = `${baseName} (${suffix++})`;
    const routine = routineFromEntries(entries, name);
    if (await saveRoutines([...routines, routine])) {
      changeDraft('routineSelection', routine.id);
      changeDraft('sessionSelection', routine.sessions[0].id);
      setActiveTab('routines');
    }
  };

  const startTemplateWorkout = async ({ routineId, sessionId, user, date, sessionOverride }) => {
    if (activeWorkout) { setActiveTab('training'); return false; }
    const routine = routines.find((item) => item.id === routineId);
    const session = sessionOverride || routine?.sessions.find((item) => item.id === sessionId);
    if (!routine || !session || !user.trim() || !date || session.exercises.length === 0) return false;
    if (user.includes(':')) {
      setSaveStatus('error');
      setSaveMessage('El nombre del usuario no puede contener dos puntos.');
      return false;
    }

      const nextWorkout = {
      id: crypto.randomUUID(),
      routineId: routine.id,
      routineName: routine.name,
      sessionId: session.id,
      sessionName: session.name,
      user: user.trim(),
      date,
      startedAt: new Date().toISOString(),
      exercises: session.exercises.map((templateExercise) => {
        const suggestedWeight = getLatestExerciseWeight(trainingEntries, user.trim(), templateExercise.exercise);
        return {
          id: crypto.randomUUID(),
          templateExerciseId: templateExercise.id,
          exercise: templateExercise.exercise,
          previousWeight: suggestedWeight,
          notes: templateExercise.notes || '',
          sets: Array.from({ length: templateExercise.targetSets }, (_, index) => ({
            id: crypto.randomUUID(),
            number: index + 1,
            targetReps: templateExercise.targetReps,
            actualReps: templateExercise.targetReps,
            weight: suggestedWeight == null ? '' : String(suggestedWeight),
            completed: false,
          })),
        };
      }),
    };

    try {
      const nextRoutines = sessionOverride ? routines.map((item) => item.id === routineId ? { ...item, sessions: item.sessions.map((current) => current.id === sessionId ? sessionOverride : current) } : item) : routines;
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, nextRoutines, nextWorkout);
      if (sessionOverride) setRoutines(nextRoutines);
      setActiveWorkout(nextWorkout);
      setCompletedWorkout(null);
      setActiveTab('training');
      setSaveMessage('Entrenamiento iniciado y guardado.');
      return true;
    } catch {
      return false;
    }
  };

  const saveActiveWorkout = async () => {
    if (!activeWorkout) return false;
    try {
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, routines, activeWorkout);
      setSaveMessage('Progreso del entrenamiento guardado.');
      return true;
    } catch {
      return false;
    }
  };

  const finishActiveWorkout = async () => {
    if (!activeWorkout) return false;
    const completedEntries = activeWorkout.exercises.flatMap((exerciseItem) =>
      exerciseItem.sets
        .filter((set) => set.completed && Number(set.actualReps) > 0 && Number(set.weight) > 0)
        .map((set) => ({
          exercise: exerciseItem.exercise,
          sets: 1,
          reps: Number(set.actualReps),
          weight: Number(set.weight),
        })),
    );

    if (completedEntries.length === 0) {
      setSaveStatus('error');
      setSaveMessage('Completa al menos una serie con repeticiones y peso válidos.');
      return false;
    }

    const block = buildManualWorkoutText({
      user: activeWorkout.user,
      date: activeWorkout.date,
      dayLabel: activeWorkout.sessionName,
      entries: completedEntries,
    });
    const wasSaved = await appendTrainingBlock(
      block,
      'Entrenamiento finalizado y series completadas guardadas.',
      completedEntries.length,
      null,
    );
    if (wasSaved) {
      setCompletedWorkout({ ...activeWorkout, completedEntries });
      setActiveWorkout(null);
    }
    return wasSaved;
  };

  const cancelActiveWorkout = async () => {
    if (!activeWorkout || !window.confirm('¿Descartar este entrenamiento activo? No se guardarán sus series.')) return false;
    try {
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, routines, null);
      setActiveWorkout(null);
      setSaveMessage('Entrenamiento activo descartado.');
      return true;
    } catch {
      return false;
    }
  };

  const exportVault = async () => {
    if (isUnlocked && draftSignature !== savedDraftRef.current && !conflictRef.current) {
      try { await persistPayload(trainingText, aliases); } catch { /* Export the encrypted recovery copy if synchronization failed. */ }
    }
    const vault = exportEncryptedVault();
    if (!vault) return;

    const blob = new Blob([vault], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gym-tracker-vault.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importVault = async (event) => {
    if (!canEdit) {
      event.target.value = '';
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      if (!window.confirm('Esta copia sustituirá los datos actuales. ¿Restaurar copia de seguridad?')) return;
      restoringRef.current = true;
      await saveQueue.current.catch(() => {});
      await replaceEncryptedVault(text, vaultId.trim(), revisionRef.current);
      savedDraftRef.current = draftSignature;
      await lockApp();
      setHasVault(true);
      setAuthError('Backup importado. Introduce contraseña para desbloquear.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo importar el backup cifrado.');
    } finally {
      restoringRef.current = false;
      event.target.value = '';
    }
  };

  const lockApp = async () => {
    if (isUnlocked && draftSignature !== savedDraftRef.current && !conflictRef.current) {
      try { await persistPayload(trainingText, aliases); } catch (error) {
        if (!error.pendingSaved && !window.confirm('No se pudieron guardar los últimos cambios. ¿Bloquear y descartarlos de esta sesión?')) return false;
      }
    }
    await saveQueue.current.catch(() => {});
    try {
      await forgetRememberedVaultKey(getRememberedKeyId(vaultId.trim(), remoteUser?.id));
    } catch {
      // Locking must still clear in-memory data even if IndexedDB is unavailable.
    }

    clearUnlockedState();
    return true;
  };

  const handleUserChange = (user) => {
    setSelectedUser(user);
    if (user !== ALL_USERS_OPTION) changeDraft('profile', user);
    const exercises = user === ALL_USERS_OPTION ? allUniqueExercises : getUserExercises(processedData, user);
    setSelectedExercise(exercises.length > 0 ? exercises[0] : '');
  };

  const openMergeModal = () => {
    if (!canEdit || selectedForMerge.length < 2) return;
    setMergeNameInput(selectedForMerge[0]);
    setShowMergeModal(true);
  };

  const performMerge = async () => {
    if (!canEdit || !mergeNameInput.trim()) return;

    const newName = mergeNameInput.trim();
    const newAliases = { ...aliases };
    const rawNamesToUpdate = new Set();

    Object.values(editedData).flat().forEach((entry) => {
      const currentDisplayName = aliases[entry.exercise] || entry.exercise;
      if (selectedForMerge.includes(currentDisplayName)) rawNamesToUpdate.add(entry.exercise);
    });

    rawNamesToUpdate.forEach((rawName) => {
      newAliases[rawName] = newName;
    });

    try {
      await persistPayload(trainingText, newAliases);
      setAliases(newAliases);
      setSelectedForMerge([]);
      setShowMergeModal(false);
      if (selectedForMerge.includes(selectedExercise)) setSelectedExercise(newName);
    } catch {
      // persistPayload exposes the conflict or storage error in the global banner.
    }
  };

  const toggleSelection = (exerciseName) => {
    if (!canEdit) return;

    setSelectedForMerge((current) =>
      current.includes(exerciseName)
        ? current.filter((entry) => entry !== exerciseName)
        : [...current, exerciseName],
    );
  };

  const openRenameModal = (exerciseName) => {
    if (!canEdit) return;

    setRenamingExercise(exerciseName);
    setRenameInput(exerciseName);
  };

  const performRename = async () => {
    if (!canEdit || !renameInput.trim() || !renamingExercise) return;

    const finalName = renameInput.trim();
    const newAliases = { ...aliases };
    const rawNamesToUpdate = new Set();

    Object.values(editedData).flat().forEach((entry) => {
      const currentDisplay = aliases[entry.exercise] || entry.exercise;
      if (currentDisplay === renamingExercise) rawNamesToUpdate.add(entry.exercise);
    });

    rawNamesToUpdate.forEach((rawName) => {
      newAliases[rawName] = finalName;
    });

    try {
      await persistPayload(trainingText, newAliases);
      setAliases(newAliases);
      setRenamingExercise(null);
      if (selectedExercise === renamingExercise) setSelectedExercise(finalName);
    } catch {
      // persistPayload exposes the conflict or storage error in the global banner.
    }
  };

  const openTrainingEditModal = (entry) => {
    if (!canEdit) return;

    setEditingEntry(entry);
    setBulkEditingEntries([]);
    setBulkEditFields(getEmptyBulkEditFields());
    setEditForm({
      user: entry.user,
      date: entry.date,
      dayLabel: entry.dayLabel,
      exercise: entry.exercise,
      sets: String(entry.sets),
      reps: String(entry.reps),
      weight: String(entry.weight),
    });
  };

  const openBulkTrainingEditModal = (entries) => {
    if (!canEdit || !entries.length) return;

    setEditingEntry(null);
    setBulkEditingEntries(entries);
    setBulkEditFields(getEmptyBulkEditFields());
    setEditForm(getBulkEditForm(entries));
  };

  const updateBulkEditField = (field, enabled) => {
    setBulkEditFields((current) => ({ ...current, [field]: enabled }));
  };

  const deleteTrainingEntries = async (entries, confirmMessage, successMessage) => {
    if (!canEdit || !entries.length) return;
    if (!window.confirm(confirmMessage)) return;

    try {
      setSaveStatus('saving');
      setSaveMessage('');

      const nextDeletedEntryIds = { ...deletedEntryIds };
      const nextEntryEdits = { ...entryEdits };

      entries.forEach((entry) => {
        nextDeletedEntryIds[entry.id] = true;
        delete nextEntryEdits[entry.id];
      });

      await persistPayload(trainingText, aliases, nextEntryEdits, nextDeletedEntryIds);
      setEntryEdits(nextEntryEdits);
      setDeletedEntryIds(nextDeletedEntryIds);
      setSaveStatus('success');
      setSaveMessage(successMessage);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo eliminar el registro.');
    }
  };

  const deleteTrainingEntry = (entry) => {
    deleteTrainingEntries(
      [entry],
      `Eliminar este registro de ${entry.exercise} (${entry.date})?`,
      'Registro eliminado y vault cifrado actualizado.',
    );
  };

  const deleteWorkoutExercise = (entries) => {
    const firstEntry = entries[0];
    if (!firstEntry) return;

    deleteTrainingEntries(
      entries,
      `Eliminar ${entries.length} registro(s) de ${firstEntry.exercise} en ${firstEntry.date}?`,
      'Ejercicio eliminado del día y vault cifrado actualizado.',
    );
  };

  const deleteSelectedTrainingEntries = (entries) => {
    deleteTrainingEntries(
      entries,
      `Eliminar ${entries.length} registro(s) seleccionado(s)?`,
      `${entries.length} registro(s) eliminado(s) y vault cifrado actualizado.`,
    );
  };

  const openRecordsWorkout = (workout) => {
    setRecordsOrigin(activeTab);
    setRecordsFocus(workout);
    setActiveTab('records');
  };

  const openRecordsDay = (day) => {
    setRecordsOrigin(activeTab);
    setRecordsFocus(day);
    setActiveTab('records');
  };

  const performTrainingEdit = async () => {
    if (!canEdit || !editingEntry || !editForm) return;

    const sets = Number(editForm.sets);
    const reps = Number(editForm.reps);
    const weight = Number(editForm.weight);

    if (!editForm.user.trim() || !editForm.date.trim() || !editForm.exercise.trim() || sets <= 0 || reps <= 0 || weight <= 0) {
      setSaveStatus('error');
      setSaveMessage('Completa usuario, fecha, ejercicio, series, reps y peso válido.');
      return;
    }

    try {
      setSaveStatus('saving');
      setSaveMessage('');

      const nextEntryEdits = {
        ...entryEdits,
        [editingEntry.id]: {
          user: editForm.user.trim(),
          date: editForm.date.trim(),
          dayLabel: editForm.dayLabel.trim() || 'Entrenamiento',
          exercise: editForm.exercise.trim(),
          sets,
          reps,
          weight,
        },
      };

      await persistPayload(trainingText, aliases, nextEntryEdits);
      setEntryEdits(nextEntryEdits);
      setEditingEntry(null);
      setEditForm(null);
      setSaveStatus('success');
      setSaveMessage('Corrección guardada y vault cifrado actualizado.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo guardar la corrección.');
    }
  };

  const performBulkTrainingEdit = async () => {
    if (!canEdit || !bulkEditingEntries.length || !editForm) return;

    const enabledFieldNames = Object.entries(bulkEditFields)
      .filter(([, enabled]) => enabled)
      .map(([field]) => field);

    if (enabledFieldNames.length === 0) {
      setSaveStatus('error');
      setSaveMessage('Marca al menos un campo para aplicar cambios.');
      return;
    }

    const sets = Number(editForm.sets);
    const reps = Number(editForm.reps);
    const weight = Number(editForm.weight);

    if (
      (bulkEditFields.user && !editForm.user.trim())
      || (bulkEditFields.date && !editForm.date.trim())
      || (bulkEditFields.exercise && !editForm.exercise.trim())
      || (bulkEditFields.sets && (!Number.isFinite(sets) || sets <= 0))
      || (bulkEditFields.reps && (!Number.isFinite(reps) || reps <= 0))
      || (bulkEditFields.weight && (!Number.isFinite(weight) || weight <= 0))
    ) {
      setSaveStatus('error');
      setSaveMessage('Completa valores válidos para los campos marcados.');
      return;
    }

    try {
      setSaveStatus('saving');
      setSaveMessage('');

      const nextEntryEdits = { ...entryEdits };

      bulkEditingEntries.forEach((entry) => {
        const nextEdit = { ...(nextEntryEdits[entry.id] || {}) };

        if (bulkEditFields.user) nextEdit.user = editForm.user.trim();
        if (bulkEditFields.date) nextEdit.date = editForm.date.trim();
        if (bulkEditFields.dayLabel) nextEdit.dayLabel = editForm.dayLabel.trim() || 'Entrenamiento';
        if (bulkEditFields.exercise) nextEdit.exercise = editForm.exercise.trim();
        if (bulkEditFields.sets) nextEdit.sets = sets;
        if (bulkEditFields.reps) nextEdit.reps = reps;
        if (bulkEditFields.weight) nextEdit.weight = weight;

        nextEntryEdits[entry.id] = nextEdit;
      });

      await persistPayload(trainingText, aliases, nextEntryEdits);
      setEntryEdits(nextEntryEdits);
      setBulkEditingEntries([]);
      setEditForm(null);
      setBulkEditFields(getEmptyBulkEditFields());
      setSaveStatus('success');
      setSaveMessage(`${bulkEditingEntries.length} registros actualizados y vault cifrado actualizado.`);
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudieron guardar los cambios masivos.');
    }
  };

  if (!isUnlocked || !parsedData) {
    return (
      <AuthScreen
        hasVault={hasVault}
        includeDemo={includeDemo}
        onIncludeDemoChange={setIncludeDemo}
        remoteVaults={remoteVaults}
        vaultListMessage={vaultListMessage}
        isRemoteStorage={isRemoteStorage}
        isRemoteAuthReady={isRemoteAuthReady}
        remoteUserEmail={remoteUser?.email || ''}
        accountEmail={accountEmail}
        accountPassword={accountPassword}
        accountMode={accountMode}
        accountStatus={accountStatus}
        accountMessage={accountMessage}
        vaultId={vaultId}
        password={password}
        rememberDevice={rememberDevice}
        isUnlocking={isUnlocking}
        isCheckingRememberedDevice={isCheckingRememberedDevice}
        authError={authError}
        onAccountEmailChange={setAccountEmail}
        onAccountPasswordChange={setAccountPassword}
        onAccountModeChange={(mode) => {
          setAccountMode(mode);
          setAccountStatus('idle');
          setAccountMessage('');
        }}
        onAccountSubmit={handleRemoteAccountSubmit}
        onAccountSignOut={handleRemoteSignOut}
        onVaultIdChange={setVaultId}
        onPasswordChange={setPassword}
        onRememberDeviceChange={setRememberDevice}
        onSubmit={handleUnlock}
        onCreateRemoteVault={createRemoteVault}
        onResetVault={resetVaultToInitialSeed}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 pb-20">
      <AppHeader onReset={lockApp} onNavigate={setActiveTab} onExport={exportVault} onImport={importVault} />

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4 relative">
        <TabNav activeTab={activeTab} onTabChange={(tab) => { setActiveTab(tab); if (tab === 'records') { setRecordsFocus(null); setRecordsOrigin(null); } }} />

        {isUnlocked && <div className="flex items-center justify-between gap-3 text-xs text-slate-400" role="status" aria-live="polite"><span>{saveStatus === 'error' ? 'Pendiente de sincronizar · revisa el aviso' : draftSignature !== savedDraftRef.current ? 'Guardando cambios…' : 'Guardado en este dispositivo' + (isRemoteStorage ? ' y sincronizado' : '')}</span>{saveStatus === 'error' && <button type="button" onClick={() => setRetrySave((value) => value + 1)} className="text-emerald-300 font-bold">Reintentar</button>}</div>}
        {conflictRef.current && <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3"><p className="text-sm text-amber-200">Hay dos versiones de tus datos. Conservamos tus cambios locales cifrados y hemos detenido la edición para evitar sobrescribir la versión guardada.</p><button type="button" onClick={async () => { await exportVault(); await discardPendingVault(vaultId); await lockApp(); }} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold">Descargar mis cambios y volver a abrir</button></div>}

        {activeTab === 'today' && <TodayTab user={uiDrafts.profile ?? (selectedUser === ALL_USERS_OPTION ? '' : selectedUser)} users={availableUsers} onUserChange={(user) => { changeDraft('profile', user); setSelectedUser(user); }} activeWorkout={activeWorkout} routines={routines} entries={trainingEntries} onStart={() => {
          if (!activeWorkout) changeDraft('inputMode', routines.some((routine) => routine.sessions.some((session) => session.exercises.length > 0)) ? 'template' : 'manual');
          setCompletedWorkout(null); setActiveTab('training');
        }} onRoutineStart={(routineId, sessionId) => startTemplateWorkout({ routineId, sessionId, user: uiDrafts.profile ?? selectedUser, date: todayInputValue() })} onCreateRoutine={() => setActiveTab('routines')} onRepeat={repeatWorkout} onOpenWorkout={openRecordsWorkout} />}

        {['records', 'calendar', 'progress', 'general'].includes(activeTab) && <div className="flex flex-wrap gap-2">{(activeTab === 'records' || activeTab === 'calendar' ? [['records', 'Sesiones'], ['calendar', 'Calendario']] : [['progress', 'Por ejercicio'], ['general', 'Resumen y comparativas']]).map(([tab, label]) => <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`rounded-xl px-4 py-3 text-sm font-bold ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 bg-slate-900'}`}>{label}</button>)}</div>}

        {activeTab === 'records' && recordsOrigin && <button type="button" onClick={() => setActiveTab(recordsOrigin)} className="text-emerald-300 font-bold text-sm">← Volver a {recordsOrigin === 'calendar' ? 'Calendario' : recordsOrigin === 'today' ? 'Hoy' : recordsOrigin === 'training' ? 'tu entrenamiento' : 'Progreso'}</button>}

        {saveStatus === 'error' && activeTab !== 'training' && (
          <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl p-3">
            {saveMessage}
          </div>
        )}

        {activeTab === 'training' && canEdit && (
          activeWorkout ? (
            <ActiveWorkoutPanel
              workout={activeWorkout}
              saveStatus={saveStatus}
              saveMessage={saveMessage}
              onWorkoutChange={changeWorkout}
              onSaveProgress={saveActiveWorkout}
              onFinish={finishActiveWorkout}
              onCancel={cancelActiveWorkout}
            />
          ) : completedWorkout ? (
            <section className="rounded-3xl p-6 bg-slate-900 border border-emerald-500/30 space-y-4"><p className="text-emerald-300 font-bold">Entrenamiento guardado</p><h2 className="text-2xl font-black">{completedWorkout.sessionName}</h2><p className="text-slate-300">{completedWorkout.completedEntries.reduce((sum, entry) => sum + entry.sets, 0)} series · {new Set(completedWorkout.completedEntries.map((entry) => entry.exercise)).size} ejercicios</p><div className="flex flex-wrap gap-3"><button type="button" onClick={() => {
              const [year, month, day] = completedWorkout.date.split('-');
              openRecordsWorkout({ user: completedWorkout.user, date: `${day}/${month}/${year}`, dayLabel: completedWorkout.sessionName });
            }} className="px-4 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold">Ver detalle</button><button type="button" onClick={() => { handleUserChange(completedWorkout.user); setActiveTab('progress'); }} className="px-4 py-3 rounded-xl bg-slate-800 font-bold">Ver progreso</button><button type="button" onClick={() => setActiveTab('today')} className="px-4 py-3 text-slate-300">Volver a Hoy</button></div></section>
          ) : (
            <TrainingInputPanel
              drafts={uiDrafts}
              onDraftChange={changeDraft}
              profile={uiDrafts.profile ?? (selectedUser === ALL_USERS_OPTION ? '' : selectedUser)}
              importPreview={inspectTrainingImport(newTrainingText, parsedData)}
              onCreateRoutine={() => setActiveTab('routines')}
              newTrainingText={newTrainingText}
              availableUsers={availableUsers}
              exerciseOptions={allUniqueExercises}
              routines={routines}
              saveStatus={saveStatus}
              saveMessage={saveMessage}
              onNewTrainingTextChange={(text) => { setNewTrainingText(text); changeDraft('pasteText', text); }}
              onAppendTraining={appendTraining}
              onAddManualWorkout={appendManualWorkout}
              onStartTemplateWorkout={startTemplateWorkout}
              onExportEncrypted={exportVault}
              onImportEncrypted={importVault}
            />
          )
        )}

        {activeTab === 'routines' && (
          <RoutinesTab
            drafts={uiDrafts}
            onDraftChange={changeDraft}
            onStartSession={(routineId, sessionId, sessionOverride) => startTemplateWorkout({ routineId, sessionId, sessionOverride, user: uiDrafts.profile ?? selectedUser, date: todayInputValue() })}
            profile={uiDrafts.profile ?? selectedUser}
            canEdit={canEdit}
            routines={routines}
            exerciseOptions={allUniqueExercises}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onSaveRoutines={saveRoutines}
          />
        )}

        {activeTab === 'records' && (
          <TrainingRecordsTab
            onRepeatWorkout={repeatWorkout}
            onSaveAsRoutine={saveWorkoutAsRoutine}
            isSaving={saveStatus === 'saving'}
            key={recordsFocus ? JSON.stringify(recordsFocus) : 'history'}
            drafts={uiDrafts}
            onDraftChange={changeDraft}
            canEdit={canEdit}
            trainingEntries={trainingEntries}
            focusedWorkout={recordsFocus}
            onOpenTrainingEdit={openTrainingEditModal}
            onOpenBulkTrainingEdit={openBulkTrainingEditModal}
            onDeleteTrainingEntry={deleteTrainingEntry}
            onDeleteWorkoutExercise={deleteWorkoutExercise}
            onDeleteSelectedTrainingEntries={deleteSelectedTrainingEntries}
          />
        )}

        {activeTab === 'exercises' && (
          <ExercisesTab
            canEdit={canEdit}
            allUniqueExercises={allUniqueExercises}
            processedData={processedData}
            selectedForMerge={selectedForMerge}
            onToggleSelection={toggleSelection}
            onOpenMergeModal={openMergeModal}
            onOpenRenameModal={openRenameModal}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTab
            availableUsers={progressUserOptions}
            chartUsers={availableUsers}
            userColors={userColors}
            isAllUsers={isAllUsersSelected}
            selectedUser={selectedUser}
            selectedExercise={selectedExercise}
            exerciseOptions={progressExerciseOptions}
            stats={stats}
            chartData={chartData}
            weightMode={progressWeightMode}
            onUserChange={handleUserChange}
            onExerciseChange={(exercise) => { setSelectedExercise(exercise); changeDraft('progressExercise', exercise); }}
            onWeightModeChange={(mode) => { setProgressWeightMode(mode); changeDraft('weightMode', mode); }}
            onOpenRecordsWorkout={openRecordsWorkout}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            drafts={uiDrafts}
            onDraftChange={changeDraft}
            processedData={processedData}
            availableUsers={availableUsers}
            userColors={userColors}
            onOpenRecordsDay={openRecordsDay}
          />
        )}

        {activeTab === 'general' && (
          <GeneralComparisonTab
            generalComparisonData={generalComparisonData}
            weeklyVolumeData={weeklyVolumeData}
            generalUserSummaries={generalUserSummaries}
            availableUsers={availableUsers}
            userColors={userColors}
          />
        )}

        {activeTab === 'aiResume' && (
          <AiResumeTab
            processedData={processedData}
            availableUsers={availableUsers}
            userColors={userColors}
          />
        )}

        {showMergeModal && canEdit && (
          <MergeExerciseModal
            mergeNameInput={mergeNameInput}
            onMergeNameChange={setMergeNameInput}
            onCancel={() => setShowMergeModal(false)}
            onConfirm={performMerge}
          />
        )}

        {renamingExercise && canEdit && (
          <RenameExerciseModal
            renameInput={renameInput}
            onRenameInputChange={setRenameInput}
            onCancel={() => setRenamingExercise(null)}
            onConfirm={performRename}
          />
        )}

        {editingEntry && editForm && canEdit && (
          <TrainingEditModal
            editForm={editForm}
            onEditFormChange={setEditForm}
            onCancel={() => {
              setEditingEntry(null);
              setEditForm(null);
            }}
            onConfirm={performTrainingEdit}
          />
        )}

        {bulkEditingEntries.length > 0 && editForm && canEdit && (
          <TrainingEditModal
            mode="bulk"
            selectedCount={bulkEditingEntries.length}
            editForm={editForm}
            enabledFields={bulkEditFields}
            onFieldEnabledChange={updateBulkEditField}
            onEditFormChange={setEditForm}
            onCancel={() => {
              setBulkEditingEntries([]);
              setEditForm(null);
              setBulkEditFields(getEmptyBulkEditFields());
            }}
            onConfirm={performBulkTrainingEdit}
          />
        )}

      </main>
    </div>
  );
}

function getEmptyBulkEditFields() {
  return {
    user: false,
    date: false,
    dayLabel: false,
    exercise: false,
    sets: false,
    reps: false,
    weight: false,
  };
}

function getBulkEditForm(entries) {
  return {
    user: getSharedEntryValue(entries, 'user'),
    date: getSharedEntryValue(entries, 'date'),
    dayLabel: getSharedEntryValue(entries, 'dayLabel'),
    exercise: getSharedEntryValue(entries, 'exercise'),
    sets: getSharedEntryValue(entries, 'sets'),
    reps: getSharedEntryValue(entries, 'reps'),
    weight: getSharedEntryValue(entries, 'weight'),
  };
}

function getSharedEntryValue(entries, field) {
  const firstValue = String(entries[0]?.[field] ?? '');
  const hasSameValue = entries.every((entry) => String(entry[field] ?? '') === firstValue);
  return hasSameValue ? firstValue : '';
}

function getEditableTrainingEntries(processedData) {
  if (!processedData) return [];

  return Object.entries(processedData)
    .flatMap(([user, entries]) => entries.map((entry) => ({ ...entry, user, workoutKey: `${entry.date}__${user}__${entry.dayLabel}` })))
    .sort((a, b) => parseTrainingDate(b.date) - parseTrainingDate(a.date));
}

function parseTrainingDate(date) {
  const [day, month, year] = date.split(/[/.-]/).map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function getRememberedKeyId(vaultId, remoteUserId) {
  return remoteUserId ? `${remoteUserId}:${vaultId}` : vaultId;
}

function buildManualWorkoutText({ user, date, dayLabel, entries }) {
  const [year, month, day] = date.split('-');
  const chatDate = `${day}/${month}/${year}`;
  const timestamp = '12:00';
  const prefix = `[${chatDate}, ${timestamp}] ${user}:`;
  const lines = [`${prefix} ### ${dayLabel || 'Entrenamiento manual'} ###`];

  entries.forEach((entry) => {
    lines.push(`${prefix} GYM_TRACKER_EXERCISE: ${entry.exercise}`);
    lines.push(`${prefix} ${entry.sets} x ${entry.reps} x ${entry.weight}`);
  });

  return lines.join('\n');
}

function countParsedEntries(data) {
  return Object.values(data || {}).reduce((total, entries) => total + entries.length, 0);
}

function getLatestExerciseWeight(trainingEntries, user, exercise) {
  const latestEntry = trainingEntries.find((entry) => entry.user === user && entry.exercise === exercise);
  return latestEntry?.weight ?? null;
}
