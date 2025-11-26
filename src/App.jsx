import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Activity, TrendingUp, Calendar, User, Dumbbell, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

// Componente principal
export default function GymTracker() {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedUser, setSelectedUser] = useState('Carlos');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [fileName, setFileName] = useState('');

  // Lógica de Parseo
  const parseWhatsAppChat = (text) => {
    const lines = text.split('\n');
    const users = { 'Carlos': [], 'Masi': [] };
    
    let currentDate = null;
    let currentUser = null;
    let currentDayLabel = null;
    
    const headerRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),.*- (.*?):/;
    const dayRegex = /### (DÍA \d+) ###/;
    const setRegex = /(\d+)\s*s\s*x\s*(\d+)\s*r\s*x\s*([\d\.,]+)/i;

    let lastExerciseName = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      const headerMatch = line.match(headerRegex);
      if (headerMatch) {
        currentDate = headerMatch[1];
        const rawUser = headerMatch[2];
        
        if (rawUser.includes('Masi')) currentUser = 'Masi';
        else if (rawUser.includes('😎') || rawUser.toLowerCase().includes('carlos')) currentUser = 'Carlos';
        else currentUser = null; 
        
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
            dayLabel: currentDayLabel,
            exercise: lastExerciseName,
            sets: parseInt(setMatch[1]),
            reps: parseInt(setMatch[2]),
            weight: weight,
            volumen: parseInt(setMatch[1]) * parseInt(setMatch[2]) * weight 
          });
        }
      } else {
        if (line.length > 2 && !line.includes('###') && !line.includes('http') && !line.match(/^\d/)) {
            lastExerciseName = line.replace(/🟢|🔴|🔵|🟠/g, '').trim();
        }
      }
    });

    return users;
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setInputText(e.target.result);
    };
    reader.readAsText(file);
  };

  const handleAnalyze = () => {
    if (!inputText) return;
    const data = parseWhatsAppChat(inputText);
    setParsedData(data);
    
    const userExercises = [...new Set(data['Carlos'].map(d => d.exercise))];
    if (userExercises.length > 0) setSelectedExercise(userExercises[0]);
  };

  // Preparar datos gráfica
  const chartData = useMemo(() => {
    if (!parsedData || !selectedUser || !selectedExercise) return [];
    
    const rawData = parsedData[selectedUser]
      .filter(entry => entry.exercise === selectedExercise)
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/');
        const [d2, m2, y2] = b.date.split('/');
        return new Date(`20${y1}-${m1}-${d1}`) - new Date(`20${y2}-${m2}-${d2}`);
      });

    const groupedByDate = rawData.reduce((acc, curr) => {
        if (!acc[curr.date] || curr.weight > acc[curr.date].weight) {
            acc[curr.date] = curr;
        }
        return acc;
    }, {});

    return Object.values(groupedByDate);

  }, [parsedData, selectedUser, selectedExercise]);

  const uniqueExercises = useMemo(() => {
    if (!parsedData || !selectedUser) return [];
    return [...new Set(parsedData[selectedUser].map(d => d.exercise))];
  }, [parsedData, selectedUser]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const maxWeight = Math.max(...chartData.map(d => d.weight));
    const startWeight = chartData[0].weight;
    const currentWeight = chartData[chartData.length - 1].weight;
    const improvement = ((currentWeight - startWeight) / startWeight) * 100;
    
    return { maxWeight, improvement: improvement.toFixed(1), totalSessions: chartData.length };
  }, [chartData]);

  // VISTA 1: INPUT / UPLOAD
  if (!parsedData) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-emerald-500/30">
        <div className="max-w-xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
          
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 rounded-full"></div>
                <div className="relative bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-2xl">
                    <Activity size={48} className="text-emerald-400" />
                </div>
            </div>
            <h1 className="text-5xl font-black tracking-tight text-white">
              Gym<span className="text-emerald-400">Tracker</span>
            </h1>
            <p className="text-slate-400 text-lg font-medium">
              Analiza tu progreso de WhatsApp al instante.
            </p>
          </div>

          {/* Card Principal */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-8 rounded-3xl shadow-2xl space-y-6">
            
            {/* Custom File Input */}
            <div className="group relative">
                <input 
                    id="file-upload" 
                    type="file" 
                    accept=".txt" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    onChange={handleFileUpload} 
                />
                <div className={`
                    border-2 border-dashed rounded-2xl p-8 transition-all duration-300 flex flex-col items-center justify-center text-center gap-3
                    ${fileName ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-slate-700 bg-slate-800/50 group-hover:border-emerald-500/30 group-hover:bg-slate-800'}
                `}>
                    {fileName ? (
                        <>
                            <CheckCircle2 size={40} className="text-emerald-400" />
                            <div>
                                <p className="text-emerald-300 font-semibold text-lg">{fileName}</p>
                                <p className="text-slate-500 text-sm">Listo para analizar</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <Upload size={40} className="text-slate-500 group-hover:text-emerald-400 transition-colors" />
                            <div>
                                <p className="text-slate-200 font-semibold text-lg">Sube tu chat de WhatsApp</p>
                                <p className="text-slate-500 text-sm">Arrastra el archivo .txt o haz click aquí</p>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-600 text-xs uppercase font-bold tracking-widest">O pega el texto</span>
                <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: 26/11/25, 22:33 - 😎: Press Banca..."
              className="w-full h-24 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder:text-slate-700 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 focus:outline-none font-mono text-sm resize-none transition-all"
            />
            
            <button
              onClick={handleAnalyze}
              disabled={!inputText}
              className="w-full group bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-black py-4 px-6 rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-2 text-lg"
            >
              <Activity className="group-hover:scale-110 transition-transform" />
              ANALIZAR DATOS
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-slate-600 text-xs font-medium">
            <AlertCircle size={14}/>
            <span>Privacidad 100%: Los datos no salen de tu dispositivo</span>
          </div>
        </div>
      </div>
    );
  }

  // VISTA 2: DASHBOARD (Diseño mejorado)
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
            onClick={() => { setParsedData(null); setInputText(''); setFileName(''); }}
            className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2 px-4 rounded-lg transition-all border border-slate-700 hover:border-slate-600 flex items-center gap-2"
          >
            <FileText size={14} />
            Nuevo Análisis
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-8 mt-6">
        
        {/* User Selector */}
        <div className="flex justify-center">
            <div className="bg-slate-900 p-1.5 rounded-2xl border border-slate-800 inline-flex shadow-xl">
            {['Carlos', 'Masi'].map((user) => (
                <button
                key={user}
                onClick={() => { 
                    setSelectedUser(user); 
                    setSelectedExercise(''); 
                }}
                className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                    selectedUser === user 
                    ? 'bg-emerald-500 text-slate-950 shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                >
                <User size={16} strokeWidth={2.5} />
                {user}
                </button>
            ))}
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl">
                    <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Seleccionar Ejercicio</label>
                    <div className="relative">
                        <select 
                            value={selectedExercise}
                            onChange={(e) => setSelectedExercise(e.target.value)}
                            className="w-full appearance-none bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500/50 outline-none font-medium cursor-pointer hover:border-slate-700 transition-colors"
                        >
                            <option value="" disabled>Elige un ejercicio...</option>
                            {uniqueExercises.map(ex => (
                                <option key={ex} value={ex}>{ex}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-emerald-500">
                            <TrendingUp size={18} />
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900/50 border border-emerald-500/10 p-6 rounded-3xl">
                   <h3 className="text-emerald-400 font-bold mb-1 flex items-center gap-2"><Activity size={16}/> Resumen</h3>
                   <p className="text-slate-400 text-sm">Estadísticas clave para {selectedExercise || 'el ejercicio seleccionado'}</p>
                </div>
            </div>
            
            {/* Stats Cards */}
            <div className="lg:col-span-2">
                 <div className="grid grid-cols-3 gap-4 h-full">
                    <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors group">
                        <div className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Dumbbell size={18} className="text-emerald-400"/>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Máximo (PR)</span>
                            <div className="text-3xl font-black text-white mt-1">
                                {stats ? stats.maxWeight : '-'}<span className="text-lg text-slate-500 font-medium ml-1">kg</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors group">
                        <div className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <TrendingUp size={18} className={Number(stats?.improvement) >= 0 ? 'text-green-400' : 'text-red-400'}/>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Progreso</span>
                            <div className={`text-3xl font-black mt-1 ${Number(stats?.improvement) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {stats ? `${Number(stats.improvement) > 0 ? '+' : ''}${stats.improvement}%` : '-'}
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/80 p-5 rounded-3xl border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors group">
                        <div className="bg-slate-800 w-10 h-10 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                            <Calendar size={18} className="text-blue-400"/>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sesiones</span>
                            <div className="text-3xl font-black text-white mt-1">
                                {stats ? stats.totalSessions : '-'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Gráfica Principal */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold flex items-center gap-2 text-white">
                <TrendingUp className="text-emerald-500" />
                Gráfica de Progreso
            </h2>
            <span className="text-xs font-medium px-3 py-1 bg-slate-800 text-slate-400 rounded-full border border-slate-700">
                {selectedExercise || 'Sin seleccionar'}
            </span>
          </div>
          
          <div className="h-[350px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12} 
                    tickMargin={15}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    domain={['dataMin - 5', 'dataMax + 5']}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#34d399', fontWeight: 'bold' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                    cursor={{ stroke: '#334155', strokeWidth: 2 }}
                  />
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    name="Peso Máx" 
                    stroke="#10b981" 
                    strokeWidth={4} 
                    dot={{ r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: '#10b981' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-full">
                    <Dumbbell size={48} className="opacity-20" />
                </div>
                <div className="text-center">
                    <p className="font-medium">No hay datos suficientes</p>
                    <p className="text-sm opacity-60">Selecciona un ejercicio con registros válidos</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Historial */}
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
             <div className="p-5 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-blue-400"/>
                    <h3 className="font-bold text-slate-200">Registros Detallados</h3>
                </div>
                <div className="text-xs font-mono text-slate-500">{parsedData[selectedUser].length} entradas</div>
             </div>
             <div className="max-h-80 overflow-y-auto custom-scrollbar">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-950 text-slate-500 sticky top-0 uppercase text-xs tracking-wider font-bold">
                        <tr>
                            <th className="p-4 bg-slate-950">Fecha</th>
                            <th className="p-4 bg-slate-950">Ejercicio</th>
                            <th className="p-4 bg-slate-950">Sets x Reps</th>
                            <th className="p-4 bg-slate-950 text-right">Carga</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {parsedData[selectedUser].slice().reverse().map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                                <td className="p-4 text-slate-500 font-mono text-xs">{entry.date}</td>
                                <td className="p-4 font-bold text-slate-200 group-hover:text-emerald-400 transition-colors">{entry.exercise}</td>
                                <td className="p-4 text-slate-400">{entry.sets}s x {entry.reps}r</td>
                                <td className="p-4 text-right">
                                    <span className="inline-block py-1 px-2 bg-slate-800 rounded-md text-emerald-400 font-bold font-mono">
                                        {entry.weight} kg
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>

      </main>
    </div>
  );
}
