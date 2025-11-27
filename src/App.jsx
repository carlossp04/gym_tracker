import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Activity, TrendingUp, Calendar, User, Dumbbell, AlertCircle, FileText, CheckCircle2, Copy, Info, Users, Trophy, Medal, Crown, Flame, BicepsFlexed, GitMerge, MessageSquare, Share, ChevronDown, ChevronUp, XCircle, FileWarning, Database, Check, FileArchive, Pencil } from 'lucide-react';
import JSZip from 'jszip'; // 📦 IMPORTANTE: Esto funcionará en tu PC tras el npm install

// Componente principal
export default function GymTracker() {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  
  // Estados de navegación y selección
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [rankingExercise, setRankingExercise] = useState('');
  const [comparisonExercise, setComparisonExercise] = useState('');
  const [activeTab, setActiveTab] = useState('progress'); 

  // Estados de UI
  const [fileName, setFileName] = useState('');
  const [fileStatus, setFileStatus] = useState('idle'); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessingZip, setIsProcessingZip] = useState(false); 
  const [showTemplate, setShowTemplate] = useState(false); 
  const [copySuccess, setCopySuccess] = useState(false);

  // Estados para gestión de ejercicios (Alias/Fusión/Renombrado)
  const [aliases, setAliases] = useState({}); 
  const [selectedForMerge, setSelectedForMerge] = useState([]); 
  const [showMergeModal, setShowMergeModal] = useState(false); 
  const [mergeNameInput, setMergeNameInput] = useState(''); 
  
  // Nuevo: Estado para renombrar
  const [renamingExercise, setRenamingExercise] = useState(null); // El ejercicio que estamos editando
  const [renameInput, setRenameInput] = useState(''); // El texto del input de renombrado

  const userColors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

  // --- LÓGICA DE PARSEO ---
  const parseWhatsAppChat = (text) => {
    const lines = text.split('\n');
    const users = {}; 
    let currentDate = null;
    let currentUser = null;
    let currentDayLabel = null;
    
    const headerRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),.*- (.*?):/;
    const dayRegex = /### (DÍA \d+) ###/;
    const setRegex = /(\d+)\s*s?\s*x\s*(\d+)\s*r?\s*x\s*([\d\.,]+)/i;

    let lastExerciseName = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      const headerMatch = line.match(headerRegex);
      if (headerMatch) {
        currentDate = headerMatch[1];
        const rawUser = headerMatch[2].trim(); 
        if (!users[rawUser]) users[rawUser] = [];
        currentUser = rawUser;
        const contentAfterHeader = line.split(':').slice(2).join(':').trim();
        if (contentAfterHeader) line = contentAfterHeader; 
      }

      if (!currentUser || !currentDate) return;

      const dayMatch = line.match(dayRegex);
      if (dayMatch) {
        currentDayLabel = dayMatch[1];
        return;
      }

      const setMatch = line.match(setRegex);
      if (setMatch) {
        const rawWeight = setMatch[3].replace(',', '.');
        const weight = parseFloat(rawWeight);

        if (!isNaN(weight) && lastExerciseName) {
          users[currentUser].push({
            date: currentDate,
            dayLabel: currentDayLabel || 'Entrenamiento',
            exercise: lastExerciseName, 
            sets: parseInt(setMatch[1]),
            reps: parseInt(setMatch[2]),
            weight: weight,
            volumen: parseInt(setMatch[1]) * parseInt(setMatch[2]) * weight 
          });
        }
      } else {
        if (line.length > 2 && !line.includes('###') && !line.includes('http') && !line.match(/^\d/) && !line.includes('omitted')) {
            lastExerciseName = line.replace(/🟢|🔴|🔵|🟠/g, '').trim();
        }
      }
    });
    return users;
  };

  const validateAndSetContent = (text) => {
      // eslint-disable-next-line no-control-regex
      const cleanText = text.replace(/^\uFEFF/, '');
      setInputText(cleanText);
      try {
          const testParse = parseWhatsAppChat(cleanText);
          const detectedUsers = Object.keys(testParse);
          if (detectedUsers.length === 0) {
              setFileStatus('error');
              setErrorMessage('El archivo no contiene datos con el formato válido (S x R x Kg).');
          } else {
              setFileStatus('success');
          }
      } catch (err) {
          setFileStatus('error');
          setErrorMessage('Error al procesar el texto del chat.');
      }
      setIsProcessingZip(false);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    setFileStatus('validating');
    setErrorMessage('');
    
    if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        setIsProcessingZip(true);
        try {
            const zip = new JSZip();
            const loadedZip = await zip.loadAsync(file);
            const chatFile = Object.values(loadedZip.files).find(f => 
                f.name.toLowerCase().endsWith('.txt') && !f.name.startsWith('__MACOSX') && !f.dir
            );
            if (chatFile) {
                const content = await chatFile.async('string');
                validateAndSetContent(content);
            } else {
                setFileStatus('error');
                setErrorMessage('El ZIP no contiene ningún archivo .txt válido.');
                setIsProcessingZip(false);
            }
        } catch (error) {
            console.error("Error ZIP:", error);
            setFileStatus('error');
            setErrorMessage('El archivo ZIP está corrupto o no se puede leer.');
            setIsProcessingZip(false);
        }
    } else {
        const reader = new FileReader();
        reader.onload = (e) => {
            validateAndSetContent(e.target.result);
        };
        reader.readAsText(file);
    }
  };

  const handleAnalyze = () => {
    if (!inputText || fileStatus !== 'success') return;
    const data = parseWhatsAppChat(inputText);
    setParsedData(data);
    
    const firstUser = Object.keys(data)[0];
    setSelectedUser(firstUser);
    
    // Inicializar selección de ejercicio con datos seguros
    const firstUserExercises = [...new Set(data[firstUser].map(d => d.exercise))];
    if (firstUserExercises.length > 0) setSelectedExercise(firstUserExercises[0]);

    // Calcular todos los ejercicios para inicializar rankings
    const allEx = new Set();
    Object.values(data).forEach(u => u.forEach(e => allEx.add(e.exercise)));
    const allExArray = [...allEx].sort();
    if (allExArray.length > 0) {
        setRankingExercise(allExArray[0]);
        setComparisonExercise(allExArray[0]);
    }

    setAliases({});
    setSelectedForMerge([]);
  };

  // --- MEMOS DE DATOS ---
  const processedData = useMemo(() => {
      if (!parsedData) return null;
      const normalized = {};
      Object.keys(parsedData).forEach(user => {
          normalized[user] = parsedData[user].map(entry => ({
              ...entry,
              exercise: aliases[entry.exercise] || entry.exercise 
          }));
      });
      return normalized;
  }, [parsedData, aliases]);

  const availableUsers = useMemo(() => processedData ? Object.keys(processedData) : [], [processedData]);
  
  const allUniqueExercises = useMemo(() => {
    if (!processedData) return [];
    const exercises = new Set();
    Object.values(processedData).forEach(userEntries => userEntries.forEach(e => exercises.add(e.exercise)));
    return [...exercises].sort();
  }, [processedData]);

  // Autoselección inicial (CORREGIDO: Usando useEffect en vez de useMemo para evitar side-effects en render)
  useEffect(() => {
      if (allUniqueExercises.length > 0) {
          if (!selectedExercise) setSelectedExercise(allUniqueExercises[0]);
          if (!rankingExercise) setRankingExercise(allUniqueExercises[0]);
          if (!comparisonExercise) setComparisonExercise(allUniqueExercises[0]);
      }
  }, [allUniqueExercises, selectedExercise, rankingExercise, comparisonExercise]);

  const rankingData = useMemo(() => {
    if (!processedData || !rankingExercise) return [];
    return Object.keys(processedData).map(user => {
        const entries = processedData[user].filter(e => e.exercise === rankingExercise);
        if (entries.length === 0) return null;
        const maxWeight = Math.max(...entries.map(e => e.weight));
        const bestSet = entries.find(e => e.weight === maxWeight);
        const totalVolume = entries.reduce((acc, curr) => acc + curr.volumen, 0);
        return { user, maxWeight, repsAtMax: bestSet ? bestSet.reps : 0, totalVolume, sessions: new Set(entries.map(e => e.date)).size };
    }).filter(item => item !== null).sort((a, b) => b.maxWeight - a.maxWeight);
  }, [processedData, rankingExercise]);

  const chartData = useMemo(() => {
    if (!processedData || !selectedUser || !selectedExercise || !processedData[selectedUser]) return [];
    const rawData = processedData[selectedUser].filter(entry => entry.exercise === selectedExercise)
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/'); const [d2, m2, y2] = b.date.split('/');
        return new Date(`20${y1}-${m1}-${d1}`) - new Date(`20${y2}-${m2}-${d2}`);
      });
    const groupedByDate = rawData.reduce((acc, curr) => {
        if (!acc[curr.date] || curr.weight > acc[curr.date].weight) acc[curr.date] = curr;
        return acc;
    }, {});
    return Object.values(groupedByDate);
  }, [processedData, selectedUser, selectedExercise]);

  const comparisonChartData = useMemo(() => {
    if (!processedData || !comparisonExercise) return [];
    const dataByDate = {};
    Object.keys(processedData).forEach(user => {
        const userEntries = processedData[user].filter(e => e.exercise === comparisonExercise);
        userEntries.forEach(entry => {
            if (!dataByDate[entry.date]) dataByDate[entry.date] = { date: entry.date, rawDate: entry.date };
            const currentMax = dataByDate[entry.date][user];
            if (!currentMax || entry.weight > currentMax) dataByDate[entry.date][user] = entry.weight;
        });
    });
    return Object.values(dataByDate).sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/'); const [d2, m2, y2] = b.date.split('/');
        return new Date(`20${y1}-${m1}-${d1}`) - new Date(`20${y2}-${m2}-${d2}`);
    });
  }, [processedData, comparisonExercise]);

  const uniqueUserExercises = useMemo(() => {
    if (!processedData || !selectedUser || !processedData[selectedUser]) return [];
    return [...new Set(processedData[selectedUser].map(d => d.exercise))];
  }, [processedData, selectedUser]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const maxWeight = Math.max(...chartData.map(d => d.weight));
    const startWeight = chartData[0].weight;
    const currentWeight = chartData[chartData.length - 1].weight;
    const improvement = ((currentWeight - startWeight) / startWeight) * 100;
    
    // --- FORMATO INTELIGENTE (MAX 6 CHARS) ---
    const formatPercent = (val) => {
        if (val === 0) return '0%';
        const absVal = Math.abs(val);
        const sign = val > 0 ? '+' : '';
        if (absVal >= 100) return `${sign}${Math.round(val)}%`;
        return `${sign}${val.toFixed(1)}%`;
    };

    return { 
        maxWeight, 
        improvement: formatPercent(improvement), // Ya formateado string
        numericImprovement: improvement, // Valor numérico para color
        totalSessions: chartData.length 
    };
  }, [chartData]);

  // UI Helpers
  const templateText = `Titulo día de entreno (Opcional)\n\nNombre Ejercicio\nSeries x Repes x Peso\n\n##   Formatos Válidos   ##\n## para los ejercicios: ##\n\nOpción 1 (Detallada):\n4s x 10r x 20.5kg\n\nOpción 2 (Rápida):\n4x10x20,5\n\n*** Ejemplo ***\n\nDia de brazo\n\nPredicador (barra z de 9kg + 10kg por lado)\n4 x 10 x 29\n\nCurl Biceps con mancuernas de 10kg\n4s x 10r x 20kg`;
  
  const copyTemplate = () => {
    const textArea = document.createElement("textarea");
    textArea.value = templateText;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      const successful = document.execCommand('copy');
      if(successful) { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }
    } catch (err) {}
    document.body.removeChild(textArea);
  };

  // --- LÓGICA DE FUSIÓN (MODAL) ---
  const openMergeModal = () => { if (selectedForMerge.length < 2) return; setMergeNameInput(selectedForMerge[0]); setShowMergeModal(true); };
  
  const performMerge = () => {
      if (!mergeNameInput.trim()) return;
      const newName = mergeNameInput.trim();
      const newAliases = { ...aliases };
      const rawNamesToUpdate = new Set();
      Object.values(parsedData).flat().forEach(entry => {
          const currentDisplayName = aliases[entry.exercise] || entry.exercise;
          if (selectedForMerge.includes(currentDisplayName)) rawNamesToUpdate.add(entry.exercise);
      });
      rawNamesToUpdate.forEach(rawName => { newAliases[rawName] = newName; });
      setAliases(newAliases);
      setSelectedForMerge([]);
      setShowMergeModal(false); 
      if (selectedForMerge.includes(selectedExercise)) setSelectedExercise(newName);
      if (selectedForMerge.includes(rankingExercise)) setRankingExercise(newName);
      if (selectedForMerge.includes(comparisonExercise)) setComparisonExercise(newName);
  };
  
  const toggleSelection = (exerciseName) => {
      if (selectedForMerge.includes(exerciseName)) setSelectedForMerge(selectedForMerge.filter(e => e !== exerciseName));
      else setSelectedForMerge([...selectedForMerge, exerciseName]);
  };

  // --- LÓGICA DE RENOMBRADO (NUEVO) ---
  const openRenameModal = (exName) => {
      setRenamingExercise(exName);
      setRenameInput(exName);
  };

  const performRename = () => {
      if (!renameInput.trim() || !renamingExercise) return;
      const finalName = renameInput.trim();
      const newAliases = { ...aliases };
      const rawNamesToUpdate = new Set();
      Object.values(parsedData).flat().forEach(entry => {
          const currentDisplay = aliases[entry.exercise] || entry.exercise;
          if (currentDisplay === renamingExercise) {
              rawNamesToUpdate.add(entry.exercise);
          }
      });
      rawNamesToUpdate.forEach(raw => { newAliases[raw] = finalName; });
      setAliases(newAliases);
      setRenamingExercise(null);
      if (selectedExercise === renamingExercise) setSelectedExercise(finalName);
      if (rankingExercise === renamingExercise) setRankingExercise(finalName);
      if (comparisonExercise === renamingExercise) setComparisonExercise(finalName);
  };


  // --- RENDERIZADO ---
  if (!parsedData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
        <div className="max-w-4xl w-full space-y-12 animate-in fade-in zoom-in duration-500 py-10">
          <div className="text-center space-y-4">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 rounded-full"></div>
                <div className="relative bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
                    <Activity size={56} className="text-emerald-400" />
                </div>
            </div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
              Gym<span className="text-emerald-400">Tracker</span>
            </h1>
            <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto">
                La forma más simple de competir con tus amigos. <br/>
                Sin apps complicadas. Solo vuestro chat de WhatsApp.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
              {[
                  {icon: MessageSquare, num: 1, title: "Crea el Grupo", text: "Haz un grupo de WhatsApp con tus compañeros. La app detectará automáticamente a todos."},
                  {icon: FileText, num: 2, title: "Registra Entrenos", text: "Usa el formato estándar. Haz click abajo para ver cómo debes escribir los mensajes."},
                  {icon: Share, num: 3, title: "Exporta y Sube", text: "En WhatsApp: Info del Grupo > Exportar Chat > Adjuntar Archivos. Sube el ZIP o el TXT."}
              ].map((step, idx) => (
                  <div key={idx} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><step.icon size={80} /></div>
                      <div className="relative z-10">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-400 font-bold mb-4 border border-emerald-500/20">{step.num}</div>
                          <h3 className="text-white font-bold text-lg mb-2">{step.title}</h3>
                          <p className="text-slate-400 text-sm leading-relaxed mb-3">{step.text}</p>
                          {idx === 1 && (
                              <div className="mt-2">
                                  <button onClick={() => setShowTemplate(!showTemplate)} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center justify-center gap-2 mb-2">
                                      {showTemplate ? 'OCULTAR PLANTILLA' : 'VER PLANTILLA'} {showTemplate ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                  </button>
                                  {showTemplate && (
                                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                                          <div className="bg-black/40 p-3 rounded-lg border border-white/10 mb-3 font-mono text-[10px] text-slate-300 overflow-x-auto"><pre className="whitespace-pre-wrap">{templateText}</pre></div>
                                          <button onClick={copyTemplate} className={`w-full py-2 text-slate-950 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 ${copySuccess ? 'bg-green-500 hover:bg-green-400' : 'bg-emerald-500 hover:bg-emerald-400'}`}>
                                              {copySuccess ? <><CheckCircle2 size={12}/> ¡COPIADO!</> : <><Copy size={12}/> COPIAR TEXTO</>}
                                          </button>
                                      </div>
                                  )}
                              </div>
                          )}
                      </div>
                  </div>
              ))}
          </div>

          <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700 p-8 rounded-3xl shadow-2xl space-y-6 max-w-2xl mx-auto transform hover:scale-[1.01] transition-transform duration-300">
            <div className="group relative cursor-pointer">
                <input id="file-upload" type="file" accept=".txt,.zip" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" onChange={handleFileUpload} />
                <div className={`border-2 border-dashed rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4 ${fileStatus === 'error' ? 'border-red-500/50 bg-red-500/5' : fileStatus === 'success' ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-600 bg-slate-800/50 group-hover:border-emerald-400 group-hover:bg-slate-800'}`}>
                    {fileStatus === 'success' ? (
                        <><div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400"><CheckCircle2 size={32} /></div><div>
                            <p className="text-emerald-300 font-bold text-xl truncate max-w-[200px] md:max-w-none mx-auto">{fileName}</p>
                            <p className="text-emerald-500/60 text-sm mt-1 font-medium">Chat detectado correctamente</p></div></>
                    ) : fileStatus === 'error' ? (
                        <><div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-400"><FileWarning size={32} /></div><div>
                            <p className="text-red-300 font-bold text-xl truncate max-w-[200px] md:max-w-none mx-auto">{fileName || 'Error'}</p>
                            <p className="text-red-400/80 text-sm mt-1 font-medium">{errorMessage}</p></div></>
                    ) : isProcessingZip ? (
                        <><div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 animate-pulse"><FileArchive size={32} /></div><div><p className="text-blue-300 font-bold text-xl">Descomprimiendo...</p><p className="text-blue-400/80 text-sm mt-1 font-medium">Buscando chat en el ZIP</p></div></>
                    ) : (
                        <><div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors"><Upload size={32} /></div><div><p className="text-slate-200 font-bold text-xl group-hover:text-white">Sube el chat (.zip o .txt)</p><p className="text-slate-500 text-sm mt-1">Arrastra el archivo exportado aquí</p></div></>
                    )}
                </div>
            </div>
            <button onClick={handleAnalyze} disabled={!fileName || fileStatus !== 'success'} className="w-full group bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-slate-950 font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg uppercase tracking-wide">
              {fileStatus === 'error' ? <><XCircle size={20} /> ARCHIVO INVÁLIDO</> : <><Activity className="group-hover:scale-110 transition-transform" /> {fileName ? 'Generar Ranking' : 'Sube un chat para empezar'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA 2: DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30 pb-20">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <Dumbbell size={24} className="text-emerald-400" />
              </div>
            <h1 className="text-xl font-bold hidden sm:block tracking-tight">Gym<span className="text-emerald-400">Tracker</span></h1>
          </div>
          <button 
            onClick={() => { setParsedData(null); setInputText(''); setFileName(''); setFileStatus('idle'); setAliases({}); setIsProcessingZip(false); }}
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 px-4 rounded-lg transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-2"
          >
            <FileText size={14} />
            Subir otro chat
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6 mt-4 relative">
        
        {/* TAB NAVIGATION - CORREGIDO SCROLL */}
        <div className="flex justify-start md:justify-center mb-6 overflow-x-auto no-scrollbar">
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 inline-flex min-w-fit">
                {['progress', 'ranking', 'comparison', 'exercises'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 capitalize ${activeTab === tab ? (tab==='ranking'?'bg-yellow-500 text-slate-950':tab==='comparison'?'bg-blue-500 text-slate-950':tab==='exercises'?'bg-purple-500 text-slate-950':'bg-emerald-500 text-slate-950') + ' shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                        {tab === 'progress' && <TrendingUp size={16} strokeWidth={2.5}/>}
                        {tab === 'ranking' && <Trophy size={16} strokeWidth={2.5}/>}
                        {tab === 'comparison' && <GitMerge size={16} strokeWidth={2.5}/>}
                        {tab === 'exercises' && <Database size={16} strokeWidth={2.5}/>}
                        {tab === 'comparison' ? 'Comparativa' : tab}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TABS --- */}
        {activeTab === 'exercises' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><Database className="text-purple-500" size={32}/> Gestión de Ejercicios</h2>
                    <p className="text-slate-400 text-sm">Gestiona nombres de ejercicios (fusionar o renombrar).</p>
                </div>
                {selectedForMerge.length > 1 && (
                    <div className="sticky top-20 z-30 flex justify-center mb-6 animate-in slide-in-from-top-4">
                        <button onClick={openMergeModal} className="bg-purple-500 hover:bg-purple-400 text-white px-8 py-3 rounded-full font-bold shadow-xl shadow-purple-900/40 flex items-center gap-2 transform hover:scale-105 transition-all">
                            <GitMerge size={20}/> Fusionar {selectedForMerge.length} seleccionados
                        </button>
                    </div>
                )}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
                                <tr>
                                    <th className="p-4 w-12 text-center"><CheckCircle2 size={16}/></th>
                                    <th className="p-6">Nombre del Ejercicio</th>
                                    <th className="p-6 text-center">Acciones</th>
                                    <th className="p-6 text-right">Registros</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-sm">
                                {allUniqueExercises.map((ex) => {
                                    const count = Object.values(processedData).flat().filter(e => e.exercise === ex).length;
                                    const isSelected = selectedForMerge.includes(ex);
                                    return (
                                        <tr key={ex} className={`transition-colors group ${isSelected ? 'bg-purple-500/10' : 'hover:bg-slate-800/30'}`}>
                                            <td className="p-4 text-center cursor-pointer" onClick={() => toggleSelection(ex)}>
                                                <div className={`w-5 h-5 rounded border mx-auto flex items-center justify-center transition-all ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600 group-hover:border-purple-400'}`}>
                                                    {isSelected && <Check size={14} className="text-white"/>}
                                                </div>
                                            </td>
                                            <td className="p-6 font-bold text-slate-200 group-hover:text-white cursor-pointer" onClick={() => toggleSelection(ex)}>{ex}</td>
                                            <td className="p-6 text-center">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); openRenameModal(ex); }}
                                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors"
                                                    title="Renombrar"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                            </td>
                                            <td className="p-6 text-right cursor-pointer" onClick={() => toggleSelection(ex)}>
                                                <span className="inline-block px-3 py-1 bg-slate-800 rounded-full text-slate-400 text-xs font-mono whitespace-nowrap">{count} sets</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'progress' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex flex-col items-center gap-2">
                    <span className="text-xs uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
                        <Users size={12}/> Selecciona Usuario
                    </span>
                    <div className="flex flex-wrap justify-center gap-2">
                        {availableUsers.map((user) => (
                            <button key={user} onClick={() => { setSelectedUser(user); const exercises = [...new Set(processedData[user].map(d => d.exercise))]; if (exercises.length > 0) setSelectedExercise(exercises[0]); else setSelectedExercise(''); }} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border ${selectedUser === user ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-white'}`}>
                            <User size={16} strokeWidth={2.5} /> {user}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="grid lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                            <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Ejercicio</label>
                            <div className="relative">
                                <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none font-medium cursor-pointer hover:border-slate-700 transition-colors">
                                    {uniqueUserExercises.map(ex => (<option key={ex} value={ex}>{ex}</option>))}
                                    {uniqueUserExercises.length === 0 && <option disabled>Sin ejercicios</option>}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-500"><TrendingUp size={18} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                         <div className="grid grid-cols-3 gap-4 h-full">
                            <div className="bg-slate-900/80 p-3 sm:p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                                <div className="bg-slate-800 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2"><Dumbbell size={18} className="text-emerald-400"/></div>
                                <div className="min-h-[2.5rem] flex items-center"><span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">Máximo (PR)</span></div>
                                <div className="text-xl sm:text-3xl font-black text-white mt-1 truncate">{stats ? stats.maxWeight : '-'}<span className="text-sm sm:text-lg text-slate-500 font-medium ml-1">kg</span></div>
                            </div>
                            <div className="bg-slate-900/80 p-3 sm:p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                                <div className="bg-slate-800 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2"><TrendingUp size={18} className={Number(stats.numericImprovement) >= 0 ? 'text-green-400' : 'text-red-400'}/></div>
                                <div className="min-h-[2.5rem] flex items-center"><span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">Progreso</span></div>
                                <div className={`text-xl sm:text-3xl font-black mt-1 truncate ${Number(stats.numericImprovement) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stats ? stats.improvement : '-'}</div>
                            </div>
                            <div className="bg-slate-900/80 p-3 sm:p-5 rounded-3xl border border-slate-800 flex flex-col justify-between">
                                <div className="bg-slate-800 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2"><Calendar size={18} className="text-blue-400"/></div>
                                <div className="min-h-[2.5rem] flex items-center"><span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">Sesiones</span></div>
                                <div className="text-xl sm:text-3xl font-black text-white mt-1 truncate">{stats ? stats.totalSessions : '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8"><h2 className="text-lg font-bold flex items-center gap-2 text-white"><TrendingUp className="text-emerald-500" /> Gráfica de Progreso</h2></div>
                  <div className="h-[350px] w-full">
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={15} axisLine={false} tickLine={false}/>
                          <YAxis stroke="#64748b" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}kg`}/>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#34d399', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}/>
                          {/* FIX 5: Ocultar puntos si hay demasiados datos */}
                          <Line type="monotone" dataKey="weight" name="Peso Máx" stroke="#10b981" strokeWidth={4} dot={chartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 } : false} activeDot={{ r: 8, fill: '#10b981' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4"><Dumbbell size={48} className="opacity-20" /><p className="font-medium">No hay datos para graficar</p></div>
                    )}
                  </div>
                </div>
            </div>
        )}

        {activeTab === 'ranking' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><Crown className="text-yellow-500 fill-yellow-500" size={32}/> Tabla de Clasificación <Crown className="text-yellow-500 fill-yellow-500" size={32}/></h2>
                    <p className="text-slate-400 text-sm">¿Quién es el más fuerte en...</p>
                    <div className="max-w-xs mx-auto mt-4 relative">
                        <select value={rankingExercise} onChange={(e) => setRankingExercise(e.target.value)} className="w-full appearance-none bg-slate-900 border-2 border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-500 font-bold focus:ring-2 focus:ring-yellow-500/50 outline-none cursor-pointer hover:border-yellow-500/40 transition-colors text-center">
                            {allUniqueExercises.map(ex => (<option key={ex} value={ex}>{ex}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-yellow-500"><BicepsFlexed size={20}/></div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[600px]">
                            <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
                                <tr><th className="p-6">Rank</th><th className="p-6">Atleta</th><th className="p-6 text-center">Peso Máximo (1RM)</th><th className="p-6 text-right">Volumen Total</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-sm">
                                {rankingData.length > 0 ? rankingData.map((user, idx) => (
                                    <tr key={user.user} className={`hover:bg-slate-800/30 transition-colors ${idx === 0 ? 'bg-yellow-500/10' : ''} ${idx === 1 ? 'bg-slate-400/5' : ''} ${idx === 2 ? 'bg-orange-700/5' : ''}`}>
                                        <td className="p-6 font-mono font-bold text-lg">{idx === 0 && <span className="text-2xl">🥇</span>}{idx === 1 && <span className="text-2xl">🥈</span>}{idx === 2 && <span className="text-2xl">🥉</span>}{idx > 2 && <span className="text-slate-600">#{idx + 1}</span>}</td>
                                        <td className="p-6"><div className="font-bold text-white text-base flex items-center gap-2">{user.user}{idx === 0 && <Flame size={14} className="text-yellow-500 fill-yellow-500"/>}</div></td>
                                        <td className="p-6 text-center"><div className="flex flex-col items-center"><div className="font-black text-emerald-400 text-lg">{user.maxWeight} kg</div><div className="text-xs text-slate-500 font-mono">x{user.repsAtMax} reps</div></div></td>
                                        <td className="p-6 text-right"><span className="font-mono text-slate-400">{user.totalVolume.toLocaleString()} kg</span></td>
                                    </tr>
                                )) : (<tr><td colSpan="4" className="p-8 text-center text-slate-500 italic">Nadie ha registrado datos para este ejercicio todavía.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'comparison' && (
             <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3"><GitMerge className="text-blue-500" size={32}/> Comparativa de Progreso</h2>
                    <p className="text-slate-400 text-sm">Visualiza todas las líneas de progreso en una sola gráfica.</p>
                    <div className="max-w-xs mx-auto mt-4 relative">
                        <select value={comparisonExercise} onChange={(e) => setComparisonExercise(e.target.value)} className="w-full appearance-none bg-slate-900 border-2 border-blue-500/20 rounded-xl px-4 py-3 text-blue-400 font-bold focus:ring-2 focus:ring-blue-500/50 outline-none cursor-pointer hover:border-blue-500/40 transition-colors text-center">
                            {allUniqueExercises.map(ex => (<option key={ex} value={ex}>{ex}</option>))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-blue-500"><Activity size={20}/></div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8"><h2 className="text-lg font-bold flex items-center gap-2 text-white"><TrendingUp className="text-blue-500" /> Evolución Comparada</h2></div>
                  <div className="h-[400px] w-full">
                    {comparisonChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={comparisonChartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={15} axisLine={false} tickLine={false}/>
                          <YAxis stroke="#64748b" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}kg`}/>
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}/>
                          <Legend wrapperStyle={{ paddingTop: '20px' }}/>
                          {/* FIX 5: Ocultar puntos en comparativa si hay muchos */}
                          {availableUsers.map((user, idx) => (<Line key={user} type="monotone" dataKey={user} name={user} stroke={userColors[idx % userColors.length]} strokeWidth={3} connectNulls={true} dot={comparisonChartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: userColors[idx % userColors.length], strokeWidth: 2 } : false} activeDot={{ r: 6 }} />))}
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4"><Dumbbell size={48} className="opacity-20" /><p className="font-medium">No hay datos suficientes para comparar</p></div>
                    )}
                  </div>
                </div>
             </div>
        )}

        {showMergeModal && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setShowMergeModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle size={24} /></button>
                    <div className="flex items-center gap-3 mb-4 text-purple-400"><GitMerge size={32} /><h3 className="text-xl font-bold text-white">Fusionar Ejercicios</h3></div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre definitivo</label>
                    <input type="text" value={mergeNameInput} onChange={(e) => setMergeNameInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 outline-none mb-6" autoFocus placeholder="Ej: Press Banca" />
                    <div className="flex gap-3">
                        <button onClick={() => setShowMergeModal(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
                        <button onClick={performMerge} className="flex-1 py-3 rounded-xl font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 transition-colors">Confirmar Fusión</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE RENOMBRAR (NUEVO) */}
        {renamingExercise && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                    <button onClick={() => setRenamingExercise(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle size={24} /></button>
                    <div className="flex items-center gap-3 mb-4 text-blue-400"><Pencil size={32} /><h3 className="text-xl font-bold text-white">Renombrar Ejercicio</h3></div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nuevo nombre</label>
                    <input type="text" value={renameInput} onChange={(e) => setRenameInput(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none mb-6" autoFocus />
                    <div className="flex gap-3">
                        <button onClick={() => setRenamingExercise(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
                        <button onClick={performRename} className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 transition-colors">Guardar</button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
