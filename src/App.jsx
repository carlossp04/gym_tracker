import { useCallback, useEffect, useMemo, useState } from 'react';
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
  exportEncryptedVault,
  forgetRememberedVaultKey,
  getRemoteSession,
  getRememberedVaultKey,
  getSavedVaultId,
  hasEncryptedVault,
  isRemoteStorageEnabled,
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
const READ_MODE = 'read';
const EDIT_MODE = 'edit';

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
  const [vaultRevision, setVaultRevision] = useState(null);
  const [appMode, setAppMode] = useState(READ_MODE);

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [progressWeightMode, setProgressWeightMode] = useState('average');
  const [activeTab, setActiveTab] = useState('progress');

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
  const canEdit = appMode === EDIT_MODE;
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
    if (availableUsers.length > 0 && (!selectedUser || (!availableUsers.includes(selectedUser) && selectedUser !== ALL_USERS_OPTION))) {
      setSelectedUser(availableUsers[0]);
    }
  }, [availableUsers, selectedUser]);

  useEffect(() => {
    if (progressExerciseOptions.length > 0 && (!selectedExercise || !progressExerciseOptions.includes(selectedExercise))) {
      setSelectedExercise(progressExerciseOptions[0]);
    }
  }, [progressExerciseOptions, selectedExercise]);

  useEffect(() => {
    if (canEdit) return;
    if (activeTab === 'training') setActiveTab('progress');
  }, [activeTab, canEdit]);

  const loadTrainingPayload = useCallback((payload, key, metadata = {}) => {
    const cleanText = normalizeChatText(payload.trainingText || '');
    const parsed = parseWhatsAppChat(cleanText);
    const { isValid } = validateParsedData(parsed);

    if (!isValid) {
      throw new Error('Datos desencriptados sin entrenamientos válidos.');
    }

    setTrainingText(cleanText);
    setParsedData(parsed);
    setAliases(payload.aliases || {});
    setEntryEdits(payload.entryEdits || {});
    setDeletedEntryIds(payload.deletedEntryIds || {});
    setRoutines(Array.isArray(payload.routines) ? payload.routines : []);
    setActiveWorkout(payload.activeWorkout?.exercises ? payload.activeWorkout : null);
    setCryptoKey(key);
    setVaultRevision(metadata.revision ?? 1);
    setIsUnlocked(true);
    setAuthError('');
    setSaveStatus('idle');
    setSaveMessage('');
  }, []);

  const clearUnlockedState = useCallback(() => {
    setIsUnlocked(false);
    setCryptoKey(null);
    setVaultRevision(null);
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
    setActiveTab('progress');
    setAppMode(READ_MODE);
  }, []);

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
      await lockApp();
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
        const exists = await remoteVaultExists(cleanVaultId);
        if (!exists) {
          setAuthError('No existe ningún vault con ese ID.');
          return;
        }

        const result = await unlockEncryptedVault(password, cleanVaultId);
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
          trainingText: normalizeChatText(initialTrainingText),
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
        trainingText: normalizeChatText(initialTrainingText),
        aliases: {},
        entryEdits: {},
        deletedEntryIds: {},
        routines: [],
        activeWorkout: null,
      };
      const result = await createEncryptedVault(password, payload, cleanVaultId);
      await rememberCurrentVaultKey(cleanVaultId, result.key);
      loadTrainingPayload(payload, result.key, result);
    } catch (error) {
      setAuthError(error.message || 'No se pudo crear el vault remoto.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const resetVaultToInitialSeed = async () => {
    const shouldReset = window.confirm('Esto borrará el vault cifrado local y lo recreará desde el export inicial al introducir una nueva contraseña. ¿Continuar?');
    if (!shouldReset) return;

    try {
      await deleteEncryptedVault(vaultId.trim());
      await lockApp();
      setHasVault(false);
      setAuthError('Vault borrado. Introduce contraseña nueva para crear base desde export inicial.');
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

  const persistPayload = async (
    nextTrainingText,
    nextAliases,
    nextEntryEdits = entryEdits,
    nextDeletedEntryIds = deletedEntryIds,
    nextRoutines = routines,
    nextActiveWorkout = activeWorkout,
  ) => {
    setSaveStatus('saving');
    setSaveMessage('');

    try {
      const metadata = await saveEncryptedVault(cryptoKey, {
        trainingText: nextTrainingText,
        aliases: nextAliases,
        entryEdits: nextEntryEdits,
        deletedEntryIds: nextDeletedEntryIds,
        routines: nextRoutines,
        activeWorkout: nextActiveWorkout,
      }, {
        vaultId: vaultId.trim(),
        expectedRevision: vaultRevision,
      });
      setVaultRevision(metadata.revision);
      setSaveStatus('success');
      setSaveMessage('Vault cifrado actualizado.');
      return metadata;
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo actualizar el vault.');
      throw error;
    }
  };

  const appendTraining = async () => {
    const wasSaved = await appendTrainingBlock(newTrainingText, 'Entreno añadido y vault cifrado actualizado.');
    if (wasSaved) setNewTrainingText('');
  };

  const appendManualWorkout = async (workout) => {
    const block = buildManualWorkoutText(workout);
    return appendTrainingBlock(
      block,
      'Entrenamiento manual añadido y vault cifrado actualizado.',
      workout.entries.length,
    );
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
      setSaveMessage('Plantillas guardadas en el vault cifrado.');
      return true;
    } catch {
      return false;
    }
  };

  const startTemplateWorkout = async ({ routineId, sessionId, user, date }) => {
    const routine = routines.find((item) => item.id === routineId);
    const session = routine?.sessions.find((item) => item.id === sessionId);
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
      await persistPayload(trainingText, aliases, entryEdits, deletedEntryIds, routines, nextWorkout);
      setActiveWorkout(nextWorkout);
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
    if (wasSaved) setActiveWorkout(null);
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

  const exportVault = () => {
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
      await replaceEncryptedVault(text, vaultId.trim(), vaultRevision);
      await lockApp();
      setHasVault(true);
      setAuthError('Backup importado. Introduce contraseña para desbloquear.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo importar el backup cifrado.');
    } finally {
      event.target.value = '';
    }
  };

  const lockApp = async () => {
    try {
      await forgetRememberedVaultKey(getRememberedKeyId(vaultId.trim(), remoteUser?.id));
    } catch {
      // Locking must still clear in-memory data even if IndexedDB is unavailable.
    }

    clearUnlockedState();
  };

  const handleUserChange = (user) => {
    setSelectedUser(user);
    const exercises = user === ALL_USERS_OPTION ? allUniqueExercises : getUserExercises(processedData, user);
    setSelectedExercise(exercises.length > 0 ? exercises[0] : '');
  };

  const clearEditModeState = () => {
    setSelectedForMerge([]);
    setShowMergeModal(false);
    setMergeNameInput('');
    setRenamingExercise(null);
    setRenameInput('');
    setEditingEntry(null);
    setBulkEditingEntries([]);
    setEditForm(null);
    setBulkEditFields(getEmptyBulkEditFields());
    setNewTrainingText('');
    setSaveStatus('idle');
    setSaveMessage('');
    if (activeTab === 'training') setActiveTab('progress');
  };

  const handleEditModeRequest = () => {
    if (canEdit) {
      clearEditModeState();
      setAppMode(READ_MODE);
      return;
    }
    setAppMode(EDIT_MODE);
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
    setRecordsFocus(workout);
    setActiveTab('records');
  };

  const openRecordsDay = (day) => {
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
      <AppHeader mode={appMode} onReset={lockApp} />

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4 relative">
        <TabNav activeTab={activeTab} canEdit={canEdit} onTabChange={setActiveTab} onModeSelect={handleEditModeRequest} />

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
              onWorkoutChange={setActiveWorkout}
              onSaveProgress={saveActiveWorkout}
              onFinish={finishActiveWorkout}
              onCancel={cancelActiveWorkout}
            />
          ) : (
            <TrainingInputPanel
              newTrainingText={newTrainingText}
              availableUsers={availableUsers}
              exerciseOptions={allUniqueExercises}
              routines={routines}
              saveStatus={saveStatus}
              saveMessage={saveMessage}
              onNewTrainingTextChange={setNewTrainingText}
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
            onExerciseChange={setSelectedExercise}
            onWeightModeChange={setProgressWeightMode}
            onOpenRecordsWorkout={openRecordsWorkout}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
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
    .flatMap(([user, entries]) => entries.map((entry) => ({ ...entry, user })))
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
