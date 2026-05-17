import { Calendar, Dumbbell, Eye, TrendingUp, User, Users } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import SearchableSelect from '../../components/SearchableSelect';

export default function ProgressTab({
  availableUsers,
  chartUsers,
  userColors,
  isAllUsers,
  selectedUser,
  selectedExercise,
  exerciseOptions,
  stats,
  chartData,
  onUserChange,
  onExerciseChange,
  onOpenRecordsWorkout,
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
      <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <SelectorBlock label="Selecciona Usuario" icon={Users}>
          <SearchableSelect
            options={availableUsers}
            value={selectedUser}
            onChange={onUserChange}
            placeholder="Seleccionar usuario..."
            icon={User}
            align="center"
          />
        </SelectorBlock>
        <div className="hidden md:block">
          <SelectorBlock label="Ejercicio" icon={TrendingUp}>
            <SearchableSelect
              options={exerciseOptions}
              value={selectedExercise}
              onChange={onExerciseChange}
              placeholder="Selecciona o busca..."
              icon={TrendingUp}
              align="center"
            />
          </SelectorBlock>
        </div>
      </div>

      {isAllUsers ? (
        <div className="space-y-4 max-w-3xl mx-auto">
          <div className="md:hidden">
            <ExercisePicker
              exerciseOptions={exerciseOptions}
              selectedExercise={selectedExercise}
              onExerciseChange={onExerciseChange}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 xl:gap-6">
            <StatCard icon={Users} iconClassName="text-blue-400" label="Usuarios" value={chartUsers.length} />
            <StatCard icon={Calendar} iconClassName="text-cyan-400" label="Fechas" value={chartData.length} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6">
          <div className="col-span-2 md:hidden">
            <ExercisePicker
              exerciseOptions={exerciseOptions}
              selectedExercise={selectedExercise}
              onExerciseChange={onExerciseChange}
            />
          </div>
          <StatCard icon={Dumbbell} iconClassName="text-emerald-400" label="Máximo (PR)" value={stats ? stats.maxWeight : '-'} unit="kg" />
          <StatCard icon={TrendingUp} iconClassName="text-cyan-400" label="1RM Est." value={stats ? stats.maxOneRepMax : '-'} unit="kg" />
          <StatCard
            icon={TrendingUp}
            iconClassName={stats && Number(stats.numericImprovement) >= 0 ? 'text-green-400' : 'text-red-400'}
            label="Progreso"
            value={stats ? stats.improvement : '-'}
            valueClassName={stats && Number(stats.numericImprovement) >= 0 ? 'text-green-400' : 'text-red-400'}
          />
          <StatCard icon={Calendar} iconClassName="text-blue-400" label="Sesiones" value={stats ? stats.totalSessions : '-'} />
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            <TrendingUp className="text-emerald-500" /> {isAllUsers ? 'Comparativa por Ejercicio' : 'Gráfica de Progreso'}
          </h2>
        </div>
        <div className="h-[350px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickMargin={15} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} domain={['dataMin - 5', 'dataMax + 5']} axisLine={false} tickLine={false} tickFormatter={(value) => `${value}kg`} />
                <Tooltip content={<ProgressTooltip isAllUsers={isAllUsers} />} />
                {isAllUsers && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                {isAllUsers ? (
                  chartUsers.map((user, idx) => (
                    <Line key={user} type="monotone" dataKey={user} name={user} stroke={userColors[idx % userColors.length]} strokeWidth={3} connectNulls dot={chartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: userColors[idx % userColors.length], strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
                  ))
                ) : (
                  <Line type="monotone" dataKey="weight" name="Mejor Serie(s)" stroke="#10b981" strokeWidth={4} dot={chartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 } : false} activeDot={{ r: 8, fill: '#10b981' }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
              <Dumbbell size={48} className="opacity-20" />
              <p className="font-medium">No hay datos para graficar</p>
            </div>
          )}
        </div>
      </div>

      {chartData.length > 0 && (
        <ProgressDataTable
          chartData={chartData}
          chartUsers={chartUsers}
          isAllUsers={isAllUsers}
          onOpenRecordsWorkout={onOpenRecordsWorkout}
        />
      )}
    </div>
  );
}

function SelectorBlock({ label, icon, children }) {
  const LabelIcon = icon;

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs uppercase font-bold text-slate-500 tracking-widest flex items-center gap-2">
        <LabelIcon size={12} /> {label}
      </span>
      <div className="relative w-full">
        {children}
      </div>
    </div>
  );
}

function ExercisePicker({ exerciseOptions, selectedExercise, onExerciseChange }) {
  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl h-full">
      <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Ejercicio</label>
      <SearchableSelect
        options={exerciseOptions}
        value={selectedExercise}
        onChange={onExerciseChange}
        placeholder="Selecciona o busca..."
        icon={TrendingUp}
      />
    </div>
  );
}

function StatCard({ icon, iconClassName, label, value, unit, valueClassName = 'text-white' }) {
  const CardIcon = icon;

  return (
    <div className="bg-slate-900/80 p-3 sm:p-5 rounded-3xl border border-slate-800 flex flex-col justify-between h-full min-h-36">
      <div className="bg-slate-800 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-2">
        <CardIcon size={18} className={iconClassName} />
      </div>
      <div className="min-h-[2.5rem] flex items-center">
        <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider leading-tight">{label}</span>
      </div>
      <div className={`text-xl sm:text-3xl font-black mt-1 truncate ${valueClassName}`}>
        {value}
        {unit && <span className="text-sm sm:text-lg text-slate-500 font-medium ml-1">{unit}</span>}
      </div>
    </div>
  );
}

function ProgressTooltip({ active, label, payload, isAllUsers }) {
  if (!active || !payload?.length) return null;

  const items = payload
    .filter((item) => item.value != null)
    .map((item) => buildTooltipItem(item, isAllUsers));

  if (items.length === 0) return null;

  return (
    <div className="min-w-56 max-w-72 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 shadow-2xl text-left">
      <p className="text-xs font-mono text-slate-400 mb-3">{label}</p>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="space-y-2 border-t border-slate-800 first:border-t-0 first:pt-0 pt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Mejor Serie(s)</p>
            {isAllUsers && <p className="text-sm font-bold text-white">{item.user}</p>}
            <div className="space-y-1">
              {item.bestSets.map((set) => (
                <p key={set.id} className="text-sm text-slate-200">
                  <span className="font-black text-white">{set.sets}</span>
                  <span className="text-slate-500"> series x </span>
                  <span className="font-black text-white">{set.reps}</span>
                  <span className="text-slate-500"> reps x </span>
                  <span className="font-black text-emerald-400">{set.weight} kg</span>
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressDataTable({ chartData, chartUsers, isAllUsers, onOpenRecordsWorkout }) {
  const rows = buildProgressTableRows(chartData, chartUsers, isAllUsers);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Datos del gráfico</h2>
          <p className="text-sm text-slate-400 mt-1">Mejores series por fecha. Usa Ver para abrir el entreno en Registros.</p>
        </div>
        <span className="text-xs font-mono text-slate-400 bg-slate-950 border border-slate-800 rounded-full px-3 py-1">{rows.length} filas</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[720px]">
          <thead className="bg-slate-950 text-slate-500 uppercase text-xs tracking-wider font-bold">
            <tr>
              <th className="p-4">Fecha</th>
              {isAllUsers && <th className="p-4">Usuario</th>}
              <th className="p-4">Mejor Serie(s)</th>
              <th className="p-4 text-right">Peso máx.</th>
              <th className="p-4 text-center">Entreno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-slate-800/30 transition-colors">
                <td className="p-4 text-slate-400 font-mono whitespace-nowrap">{row.date}</td>
                {isAllUsers && <td className="p-4 text-slate-300 font-bold whitespace-nowrap">{row.user}</td>}
                <td className="p-4 text-slate-200">
                  <div className="space-y-1">
                    {row.bestSets.map((set) => (
                      <p key={set.id}>
                        <span className="font-black text-white">{set.sets}</span>
                        <span className="text-slate-500"> series x </span>
                        <span className="font-black text-white">{set.reps}</span>
                        <span className="text-slate-500"> reps x </span>
                        <span className="font-black text-emerald-400">{set.weight} kg</span>
                      </p>
                    ))}
                  </div>
                </td>
                <td className="p-4 text-right text-emerald-400 font-black whitespace-nowrap">{row.maxWeight} kg</td>
                <td className="p-4 text-center">
                  <button
                    type="button"
                    onClick={() => onOpenRecordsWorkout(row.workout)}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-black inline-flex items-center gap-2"
                  >
                    <Eye size={14} /> Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function buildProgressTableRows(chartData, chartUsers, isAllUsers) {
  if (!isAllUsers) {
    return chartData.map((point) => {
      const bestSets = point.bestSets || [];
      const firstBestSet = bestSets[0] || point;

      return {
        key: `${point.workoutKey}-${point.date}`,
        date: point.date,
        user: point.user,
        bestSets,
        maxWeight: point.weight,
        workout: {
          workoutKey: point.workoutKey,
          user: point.user,
          date: firstBestSet.date || point.date,
          dayLabel: firstBestSet.dayLabel,
          exercise: firstBestSet.exercise,
        },
      };
    });
  }

  return chartData.flatMap((point) => chartUsers
    .filter((user) => point[user] != null)
    .map((user) => {
      const bestSets = point[`${user}__bestSets`] || [];
      const firstBestSet = bestSets[0] || {};
      const workoutKey = point[`${user}__workoutKey`];

      return {
        key: `${workoutKey}-${user}-${point.date}`,
        date: point.date,
        user,
        bestSets,
        maxWeight: point[user],
        workout: {
          workoutKey,
          user,
          date: firstBestSet.date || point.date,
          dayLabel: firstBestSet.dayLabel,
          exercise: firstBestSet.exercise,
        },
      };
    }));
}

function buildTooltipItem(item, isAllUsers) {
  const payload = item.payload || {};
  const user = isAllUsers ? item.name : payload.user;
  const bestSets = isAllUsers ? payload[`${item.name}__bestSets`] || [] : payload.bestSets || [];
  const firstBestSet = bestSets[0] || payload;
  const workoutKey = isAllUsers ? payload[`${item.name}__workoutKey`] : payload.workoutKey;

  return {
    key: `${user}-${payload.date}-${workoutKey || item.dataKey}`,
    user,
    bestSets,
    workout: {
      workoutKey,
      user,
      date: firstBestSet.date || payload.date,
      dayLabel: firstBestSet.dayLabel,
      exercise: firstBestSet.exercise,
    },
  };
}
