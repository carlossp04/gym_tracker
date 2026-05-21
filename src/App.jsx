import { useCallback, useEffect, useMemo, useState } from 'react';
import { initialTrainingText, userColors } from './constants/appConstants';
import AuthScreen from './features/auth/AuthScreen';
import AppHeader from './features/layout/AppHeader';
import TabNav from './features/layout/TabNav';
import ProgressTab from './features/progress/ProgressTab';
import CalendarTab from './features/calendar/CalendarTab';
import ExercisesTab from './features/exercises/ExercisesTab';
import GeneralComparisonTab from './features/general/GeneralComparisonTab';
import MergeExerciseModal from './features/exercises/MergeExerciseModal';
import RenameExerciseModal from './features/exercises/RenameExerciseModal';
import TrainingEditModal from './features/training/TrainingEditModal';
import TrainingInputPanel from './features/training/TrainingInputPanel';
import TrainingRecordsTab from './features/training/TrainingRecordsTab';
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
  getRememberedVaultKey,
  getSavedVaultId,
  hasEncryptedVault,
  isRemoteStorageEnabled,
  rememberVaultKey,
  replaceEncryptedVault,
  remoteVaultExists,
  saveEncryptedVault,
  saveVaultId,
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
  const [hasVault, setHasVault] = useState(() => hasEncryptedVault());
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [isCheckingRememberedDevice, setIsCheckingRememberedDevice] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [newTrainingText, setNewTrainingText] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

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

  const loadTrainingPayload = useCallback((payload, key) => {
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
    setCryptoKey(key);
    setIsUnlocked(true);
    setAuthError('');
    setSaveStatus('idle');
    setSaveMessage('');
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const unlockRememberedDevice = async () => {
      const cleanVaultId = initialAutoUnlockVaultId.trim();

      try {
        setIsCheckingRememberedDevice(true);
        const rememberedKey = await getRememberedVaultKey(cleanVaultId);
        if (!rememberedKey || isCancelled) return;

        setIsUnlocking(true);
        const result = await unlockEncryptedVaultWithKey(rememberedKey, cleanVaultId);
        if (!result || isCancelled) return;

        loadTrainingPayload(result.payload, result.key);
        setRememberDevice(true);
      } catch {
        try {
          await forgetRememberedVaultKey(cleanVaultId);
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
  }, [initialAutoUnlockVaultId, loadTrainingPayload]);

  const rememberCurrentVaultKey = async (cleanVaultId, key) => {
    if (!rememberDevice) return;

    try {
      await rememberVaultKey(cleanVaultId, key);
    } catch {
      // Remembering the device is optional; successful password unlock should still proceed.
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

        const { key, payload } = await unlockEncryptedVault(password, cleanVaultId);
        await rememberCurrentVaultKey(cleanVaultId, key);
        loadTrainingPayload(payload, key);
      } else if (hasVault) {
        const { key, payload } = await unlockEncryptedVault(password);
        await rememberCurrentVaultKey(cleanVaultId, key);
        loadTrainingPayload(payload, key);
      } else {
        const payload = {
          trainingText: normalizeChatText(initialTrainingText),
          aliases: {},
          entryEdits: {},
          deletedEntryIds: {},
        };
        const { key } = await createEncryptedVault(password, payload);
        await rememberCurrentVaultKey(cleanVaultId, key);
        setHasVault(true);
        loadTrainingPayload(payload, key);
      }
    } catch {
      setAuthError('Contraseña incorrecta o datos cifrados corruptos.');
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
  ) => {
    await saveEncryptedVault(cryptoKey, {
      trainingText: nextTrainingText,
      aliases: nextAliases,
      entryEdits: nextEntryEdits,
      deletedEntryIds: nextDeletedEntryIds,
    }, undefined, vaultId.trim());
  };

  const appendTraining = async () => {
    if (!newTrainingText.trim() || !cryptoKey) return;

    try {
      setSaveStatus('saving');
      setSaveMessage('');

      const nextText = `${trainingText.trim()}\n${normalizeChatText(newTrainingText.trim())}`;
      const { cleanText, parsed } = parseAndValidateTrainingText(nextText);

      await persistPayload(cleanText, aliases);
      setTrainingText(cleanText);
      setParsedData(parsed);
      setNewTrainingText('');
      setSaveStatus('success');
      setSaveMessage('Entreno añadido y vault cifrado actualizado.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo añadir el entreno.');
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
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      await replaceEncryptedVault(text, vaultId.trim());
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
      await forgetRememberedVaultKey(vaultId.trim());
    } catch {
      // Locking must still clear in-memory data even if IndexedDB is unavailable.
    }

    setIsUnlocked(false);
    setCryptoKey(null);
    setParsedData(null);
    setTrainingText('');
    setAliases({});
    setEntryEdits({});
    setDeletedEntryIds({});
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
  };

  const handleUserChange = (user) => {
    setSelectedUser(user);
    const exercises = user === ALL_USERS_OPTION ? allUniqueExercises : getUserExercises(processedData, user);
    setSelectedExercise(exercises.length > 0 ? exercises[0] : '');
  };

  const openMergeModal = () => {
    if (selectedForMerge.length < 2) return;
    setMergeNameInput(selectedForMerge[0]);
    setShowMergeModal(true);
  };

  const performMerge = async () => {
    if (!mergeNameInput.trim()) return;

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

    await persistPayload(trainingText, newAliases);
    setAliases(newAliases);
    setSelectedForMerge([]);
    setShowMergeModal(false);
    if (selectedForMerge.includes(selectedExercise)) setSelectedExercise(newName);
  };

  const toggleSelection = (exerciseName) => {
    setSelectedForMerge((current) =>
      current.includes(exerciseName)
        ? current.filter((entry) => entry !== exerciseName)
        : [...current, exerciseName],
    );
  };

  const openRenameModal = (exerciseName) => {
    setRenamingExercise(exerciseName);
    setRenameInput(exerciseName);
  };

  const performRename = async () => {
    if (!renameInput.trim() || !renamingExercise) return;

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

    await persistPayload(trainingText, newAliases);
    setAliases(newAliases);
    setRenamingExercise(null);
    if (selectedExercise === renamingExercise) setSelectedExercise(finalName);
  };

  const openTrainingEditModal = (entry) => {
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
    if (!entries.length) return;

    setEditingEntry(null);
    setBulkEditingEntries(entries);
    setBulkEditFields(getEmptyBulkEditFields());
    setEditForm(getBulkEditForm(entries));
  };

  const updateBulkEditField = (field, enabled) => {
    setBulkEditFields((current) => ({ ...current, [field]: enabled }));
  };

  const deleteTrainingEntries = async (entries, confirmMessage, successMessage) => {
    if (!entries.length) return;
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
    if (!editingEntry || !editForm) return;

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
    if (!bulkEditingEntries.length || !editForm) return;

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
        vaultId={vaultId}
        password={password}
        rememberDevice={rememberDevice}
        isUnlocking={isUnlocking}
        isCheckingRememberedDevice={isCheckingRememberedDevice}
        authError={authError}
        onVaultIdChange={setVaultId}
        onPasswordChange={setPassword}
        onRememberDeviceChange={setRememberDevice}
        onSubmit={handleUnlock}
        onResetVault={resetVaultToInitialSeed}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 pb-20">
      <AppHeader onReset={lockApp} />

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4 relative">
        <TabNav activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'training' && (
          <TrainingInputPanel
            newTrainingText={newTrainingText}
            saveStatus={saveStatus}
            saveMessage={saveMessage}
            onNewTrainingTextChange={setNewTrainingText}
            onAppendTraining={appendTraining}
            onExportEncrypted={exportVault}
            onImportEncrypted={importVault}
          />
        )}

        {activeTab === 'records' && (
          <TrainingRecordsTab
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

        {showMergeModal && (
          <MergeExerciseModal
            mergeNameInput={mergeNameInput}
            onMergeNameChange={setMergeNameInput}
            onCancel={() => setShowMergeModal(false)}
            onConfirm={performMerge}
          />
        )}

        {renamingExercise && (
          <RenameExerciseModal
            renameInput={renameInput}
            onRenameInputChange={setRenameInput}
            onCancel={() => setRenamingExercise(null)}
            onConfirm={performRename}
          />
        )}

        {editingEntry && editForm && (
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

        {bulkEditingEntries.length > 0 && editForm && (
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
