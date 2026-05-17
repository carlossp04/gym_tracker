import { useEffect, useMemo, useState } from 'react';
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
import TrainingInputPanel from './features/training/TrainingInputPanel';
import {
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
  getSavedVaultId,
  hasEncryptedVault,
  isRemoteStorageEnabled,
  replaceEncryptedVault,
  remoteVaultExists,
  saveEncryptedVault,
  saveVaultId,
  unlockEncryptedVault,
} from './lib/secureStorage';
import { normalizeChatText, parseWhatsAppChat, validateParsedData } from './lib/whatsappParser';

const ALL_USERS_OPTION = 'Todos los usuarios';

export default function GymTracker() {
  const [trainingText, setTrainingText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultId, setVaultId] = useState(() => getSavedVaultId());
  const [isRemoteStorage] = useState(() => isRemoteStorageEnabled());
  const [hasVault, setHasVault] = useState(() => hasEncryptedVault());
  const [password, setPassword] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [authError, setAuthError] = useState('');
  const [newTrainingText, setNewTrainingText] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveMessage, setSaveMessage] = useState('');

  const [selectedUser, setSelectedUser] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [activeTab, setActiveTab] = useState('progress');

  const [aliases, setAliases] = useState({});
  const [selectedForMerge, setSelectedForMerge] = useState([]);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeNameInput, setMergeNameInput] = useState('');
  const [renamingExercise, setRenamingExercise] = useState(null);
  const [renameInput, setRenameInput] = useState('');

  const processedData = useMemo(() => applyExerciseAliases(parsedData, aliases), [parsedData, aliases]);
  const availableUsers = useMemo(() => getAvailableUsers(processedData), [processedData]);
  const progressUserOptions = useMemo(() => [ALL_USERS_OPTION, ...availableUsers], [availableUsers]);
  const allUniqueExercises = useMemo(() => getAllUniqueExercises(processedData), [processedData]);
  const uniqueUserExercises = useMemo(() => getUserExercises(processedData, selectedUser), [processedData, selectedUser]);
  const isAllUsersSelected = selectedUser === ALL_USERS_OPTION;
  const progressExerciseOptions = isAllUsersSelected ? allUniqueExercises : uniqueUserExercises;
  const userChartData = useMemo(() => getProgressChartData(processedData, selectedUser, selectedExercise), [processedData, selectedUser, selectedExercise]);
  const multiUserChartData = useMemo(() => getComparisonChartData(processedData, selectedExercise), [processedData, selectedExercise]);
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

  const loadTrainingPayload = (payload, key) => {
    const cleanText = normalizeChatText(payload.trainingText || '');
    const parsed = parseWhatsAppChat(cleanText);
    const { isValid } = validateParsedData(parsed);

    if (!isValid) {
      throw new Error('Datos desencriptados sin entrenamientos válidos.');
    }

    setTrainingText(cleanText);
    setParsedData(parsed);
    setAliases(payload.aliases || {});
    setCryptoKey(key);
    setIsUnlocked(true);
    setAuthError('');
    setSaveStatus('idle');
    setSaveMessage('');
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
        if (exists) {
          const { key, payload } = await unlockEncryptedVault(password, cleanVaultId);
          loadTrainingPayload(payload, key);
        } else {
          const payload = {
            trainingText: normalizeChatText(initialTrainingText),
            aliases: {},
          };
          const { key } = await createEncryptedVault(password, payload, cleanVaultId);
          setHasVault(true);
          loadTrainingPayload(payload, key);
        }
      } else if (hasVault) {
        const { key, payload } = await unlockEncryptedVault(password);
        loadTrainingPayload(payload, key);
      } else {
        const payload = {
          trainingText: normalizeChatText(initialTrainingText),
          aliases: {},
        };
        const { key } = await createEncryptedVault(password, payload);
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
      lockApp();
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

  const persistPayload = async (nextTrainingText, nextAliases) => {
    await saveEncryptedVault(cryptoKey, {
      trainingText: nextTrainingText,
      aliases: nextAliases,
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
      lockApp();
      setHasVault(true);
      setAuthError('Backup importado. Introduce contraseña para desbloquear.');
    } catch (error) {
      setSaveStatus('error');
      setSaveMessage(error.message || 'No se pudo importar el backup cifrado.');
    } finally {
      event.target.value = '';
    }
  };

  const lockApp = () => {
    setIsUnlocked(false);
    setCryptoKey(null);
    setParsedData(null);
    setTrainingText('');
    setAliases({});
    setSelectedForMerge([]);
    setNewTrainingText('');
    setPassword('');
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

    Object.values(parsedData).flat().forEach((entry) => {
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

    Object.values(parsedData).flat().forEach((entry) => {
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

  if (!isUnlocked || !parsedData) {
    return (
      <AuthScreen
        hasVault={hasVault}
        isRemoteStorage={isRemoteStorage}
        vaultId={vaultId}
        password={password}
        isUnlocking={isUnlocking}
        authError={authError}
        onVaultIdChange={setVaultId}
        onPasswordChange={setPassword}
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
            onUserChange={handleUserChange}
            onExerciseChange={setSelectedExercise}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            processedData={processedData}
            availableUsers={availableUsers}
            userColors={userColors}
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
      </main>
    </div>
  );
}
