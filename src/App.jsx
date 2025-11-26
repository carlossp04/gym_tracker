import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Upload, Activity, TrendingUp, Calendar, User, Dumbbell, AlertCircle, FileText } from 'lucide-react';

// Componente principal
export default function GymTracker() {
  const [inputText, setInputText] = useState('');
  const [parsedData, setParsedData] = useState(null);
  const [selectedUser, setSelectedUser] = useState('Carlos'); // Por defecto Carlos (😎)
  const [selectedExercise, setSelectedExercise] = useState('');

  // Lógica de Parseo (El "cerebro" que lee el WhatsApp)
  const parseWhatsAppChat = (text) => {
    const lines = text.split('\n');
    const users = { 'Carlos': [], 'Masi': [] };
    
    let currentDate = null;
    let currentUser = null;
    let currentDayLabel = null;
    
    // Regex para cabeceras de WhatsApp (dd/mm/yy, hh:mm - Usuario:)
    const headerRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),.*- (.*?):/;
    // Regex para bloques de día
    const dayRegex = /### (DÍA \d+) ###/;
    // Regex para sets: 4s x 8r x 30 (o 30.5)
    const setRegex = /(\d+)\s*s\s*x\s*(\d+)\s*r\s*x\s*([\d\.,]+)/i;

    let lastExerciseName = null;

    lines.forEach(line => {
      line = line.trim();
      if (!line) return;

      // 1. Detectar Cabecera
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

      // 2. Detectar Día
      const dayMatch = line.match(dayRegex);
      if (dayMatch) {
        currentDayLabel = dayMatch[1];
        return;
      }

      // 3. Detectar Datos
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
        // Filtrado de nombres de ejercicios (ignora URLs, números sueltos, etc.)
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

  // Preparar datos para la gráfica
  const chartData = useMemo(() => {
    if (!parsedData || !selectedUser || !selectedExercise) return [];
    
    const rawData = parsedData[selectedUser]
      .filter(entry => entry.exercise === selectedExercise)
      .sort((a, b) => {
        const [d1, m1, y1] = a.date.split('/');
        const [d2, m2, y2] = b.date.split('/');
        return new Date(`20${y1}-${m1}-${d1}`) - new Date(`20${y2}-${m2}-${d2}`);
      });

    // Agrupar por fecha (Máximo peso del día)
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
      <div className="min-h-screen bg-slate-900 text-slate-100 p-6 flex flex-col items-center justify-center font-sans">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-emerald-500 p-3 rounded-full">
                <Activity size={40} className="text-slate-900" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">Gym Bro Parser</h1>
            <p className="text-slate-400 text-lg">
              Sube vuestro chat de WhatsApp para ver el progreso.
            </p>
          </div>

          <div className="bg-slate-800 p-6 rounded-2xl shadow-xl border border-slate-700">
            
            {/* Zona Drag & Drop */}
            <div className="mb-6">
                <label 
                    htmlFor="file-upload" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-slate-400" />
                        <p className="mb-2 text-sm text-slate-400"><span className="font-semibold text-emerald-400">Click para subir</span> chat de WhatsApp (.txt)</p>
                        <p className="text-xs text-slate-500">o arrastra el archivo aquí</p>
                    </div>
                    <input id="file-upload" type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                </label>
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-700"></div>
                <span className="flex-shrink-0 mx-4 text-slate-500 text-xs uppercase">O pega el texto manualmente</span>
                <div className="flex-grow border-t border-slate-700"></div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ejemplo: 26/11/25, 22:33 - 😎: Press Banca..."
              className="w-full h-32 bg-slate-900 border-slate-700 rounded-lg p-4 text-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-sm resize-none mt-4"
            />
            
            <button
              onClick={handleAnalyze}
              disabled={!inputText}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Activity size={20} />
              Analizar Entrenamiento
            </button>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 text-sm text-slate-400">
            <p className="flex items-center gap-2 mb-2 font-semibold text-emerald-400">
              <AlertCircle size={16}/> Formato detectado:
            </p>
            <code className="block bg-slate-950 p-2 rounded text-xs">
              Ejercicio<br/>
              Sets x Reps x Peso (ej: 4s x 8r x 30 o 30,5)
            </code>
          </div>
        </div>
      </div>
    );
  }

  // VISTA 2: DASHBOARD
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-emerald-500 p-2 rounded-lg">
                <Dumbbell size={24} className="text-slate-900" />
              </div>
            <h1 className="text-xl font-bold hidden sm:block">Gym Tracker</h1>
          </div>
          
          <button 
            onClick={() => { setParsedData(null); setInputText(''); }}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <FileText size={16} />
            Subir nuevo chat
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Selector de Usuario */}
        <div className="flex justify-center p-1 bg-slate-900 rounded-xl w-fit mx-auto border border-slate-800">
          {['Carlos', 'Masi'].map((user) => (
            <button
              key={user}
              onClick={() => { 
                  setSelectedUser(user); 
                  setSelectedExercise(''); 
              }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedUser === user 
                  ? 'bg-emerald-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={16} />
              {user}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-1 space-y-4">
                <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 uppercase tracking-wider">Ejercicio</label>
                    <select 
                        value={selectedExercise}
                        onChange={(e) => setSelectedExercise(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                        <option value="" disabled>Selecciona un ejercicio</option>
                        {uniqueExercises.map(ex => (
                            <option key={ex} value={ex}>{ex}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            {/* Stats Cards */}
            <div className="md:col-span-2">
                 <div className="grid grid-cols-3 gap-4 h-full">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
                        <span className="text-xs text-slate-400 mb-1">Carga Máxima</span>
                        <span className="text-2xl font-bold text-emerald-400">
                            {stats ? `${stats.maxWeight} kg` : '-'}
                        </span>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
                        <span className="text-xs text-slate-400 mb-1">Mejora Total</span>
                        <span className={`text-2xl font-bold ${Number(stats?.improvement) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats ? `${Number(stats.improvement) > 0 ? '+' : ''}${stats.improvement}%` : '-'}
                        </span>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col justify-center">
                        <span className="text-xs text-slate-400 mb-1">Registros</span>
                        <span className="text-2xl font-bold text-blue-400">
                            {stats ? stats.totalSessions : '-'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Gráfica Principal */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="text-emerald-500" />
            Progreso en {selectedExercise || '...'}
          </h2>
          
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={12} 
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={12}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                    itemStyle={{ color: '#34d399' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    name="Peso Máx (kg)" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Dumbbell size={48} className="mb-4 opacity-20" />
                <p>No hay datos suficientes para graficar este ejercicio.</p>
                <p className="text-sm">Asegúrate de que haya mensajes con formato "4s x 8r x 30"</p>
              </div>
            )}
          </div>
        </div>

        {/* Historial */}
        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
             <div className="p-4 border-b border-slate-700 flex items-center gap-2">
                <Calendar size={18} className="text-blue-400"/>
                <h3 className="font-semibold">Historial de Registros Detectados</h3>
             </div>
             <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Ejercicio</th>
                            <th className="p-3">Detalle</th>
                            <th className="p-3">Peso</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {parsedData[selectedUser].slice().reverse().map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-700/50 transition-colors">
                                <td className="p-3 text-slate-400">{entry.date}</td>
                                <td className="p-3 font-medium text-white">{entry.exercise}</td>
                                <td className="p-3">{entry.sets}s x {entry.reps}r</td>
                                <td className="p-3 text-emerald-400 font-bold">{entry.weight} kg</td>
                            </tr>
                        ))}
                         {parsedData[selectedUser].length === 0 && (
                             <tr>
                                 <td colSpan="4" className="p-8 text-center text-slate-500">
                                     No se encontraron datos para {selectedUser}
                                 </td>
                             </tr>
                         )}
                    </tbody>
                </table>
             </div>
        </div>

      </main>
    </div>
  );
}
