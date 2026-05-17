import { Activity, BarChart3, Dumbbell, Layers, TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function GeneralComparisonTab({
  generalComparisonData,
  weeklyVolumeData,
  generalUserSummaries,
  availableUsers,
  userColors,
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3">
          <BarChart3 className="text-cyan-400" size={32} /> Comparativa General
        </h2>
        <p className="text-slate-400 text-sm">Progreso global por volumen acumulado y consistencia.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {generalUserSummaries.map((summary, index) => (
          <div key={summary.user} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-black text-white">{summary.user}</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Resumen total</p>
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-700" style={{ color: userColors[index % userColors.length] }}>
                <Dumbbell size={20} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SummaryMetric icon={TrendingUp} label="Volumen" value={`${Math.round(summary.totalVolume).toLocaleString()} kg`} />
              <SummaryMetric icon={Activity} label="Sesiones" value={summary.sessions} />
              <SummaryMetric icon={Layers} label="Sets" value={summary.totalSets} />
              <SummaryMetric icon={Dumbbell} label="Ejercicios" value={summary.uniqueExercises} />
            </div>
            <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ejercicios Mejorados</p>
                <p className="text-white font-black text-2xl">
                  {summary.improvedExercises}
                  <span className="text-sm text-slate-500 font-medium">/{summary.comparableExercises}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Mejora Media</p>
                <p className={`font-black text-2xl ${summary.avgImprovement >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {summary.formattedAvgImprovement}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <BarChart3 className="text-cyan-400" /> Kilos Movidos por Semana
          </h2>
        </div>
        <div className="h-[420px] w-full">
          {weeklyVolumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyVolumeData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="week" stroke="#64748b" fontSize={12} tickMargin={15} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }} formatter={(value, name, item) => formatVolumeTooltip(value, name, item, 'Volumen semanal')} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {availableUsers.map((user, idx) => (
                  <Line key={user} type="monotone" dataKey={user} name={user} stroke={userColors[idx % userColors.length]} strokeWidth={3} dot={weeklyVolumeData.length < 30 ? { r: 4, fill: '#0f172a', stroke: userColors[idx % userColors.length], strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Dumbbell size={48} className="opacity-20" />
              <p className="font-medium">No hay datos suficientes para comparar</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <TrendingUp className="text-cyan-400" /> Volumen Acumulado
          </h2>
        </div>
        <div className="h-[420px] w-full">
          {generalComparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={generalComparisonData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={15} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }} formatter={(value, name, item) => formatVolumeTooltip(value, name, item, 'Volumen')} />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                {availableUsers.map((user, idx) => (
                  <Line key={user} type="monotone" dataKey={user} name={user} stroke={userColors[idx % userColors.length]} strokeWidth={3} dot={generalComparisonData.length < 30 ? { r: 4, fill: '#0f172a', stroke: userColors[idx % userColors.length], strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Dumbbell size={48} className="opacity-20" />
              <p className="font-medium">No hay datos suficientes para comparar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatVolumeTooltip(value, name, item, label) {
  const reps = item.payload?.[`${name}__reps`];
  return [`${Number(value).toLocaleString()} kg${reps ? ` · ${reps} reps` : ''}`, `${label} ${name}`];
}

function SummaryMetric({ icon, label, value }) {
  const MetricIcon = icon;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3">
      <div className="flex items-center gap-2 text-slate-500 mb-2">
        <MetricIcon size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-white font-black text-lg truncate">{value}</p>
    </div>
  );
}
