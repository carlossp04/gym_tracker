import { Calendar, Dumbbell, TrendingUp, User, Users } from 'lucide-react';
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
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 md:hidden">
            <ExercisePicker
              exerciseOptions={exerciseOptions}
              selectedExercise={selectedExercise}
              onExerciseChange={onExerciseChange}
            />
          </div>
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-4 h-full">
              <StatCard icon={Users} iconClassName="text-blue-400" label="Usuarios" value={chartUsers.length} />
              <StatCard icon={Calendar} iconClassName="text-cyan-400" label="Fechas" value={chartData.length} />
            </div>
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
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' }} itemStyle={{ color: '#34d399', fontWeight: 'bold' }} labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }} formatter={(value, name, item) => formatProgressTooltip(value, name, item, isAllUsers)} />
                {isAllUsers && <Legend wrapperStyle={{ paddingTop: '20px' }} />}
                {isAllUsers ? (
                  chartUsers.map((user, idx) => (
                    <Line key={user} type="monotone" dataKey={user} name={user} stroke={userColors[idx % userColors.length]} strokeWidth={3} connectNulls dot={chartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: userColors[idx % userColors.length], strokeWidth: 2 } : false} activeDot={{ r: 6 }} />
                  ))
                ) : (
                  <Line type="monotone" dataKey="weight" name="Peso Máx" stroke="#10b981" strokeWidth={4} dot={chartData.length < 30 ? { r: 4, fill: '#0f172a', stroke: '#10b981', strokeWidth: 2 } : false} activeDot={{ r: 8, fill: '#10b981' }} />
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

function formatProgressTooltip(value, name, item, isAllUsers) {
  const reps = isAllUsers ? item.payload?.[`${name}__reps`] : item.payload?.reps;
  const label = isAllUsers ? name : 'Peso Máx';
  return [`${value} kg${reps ? ` x ${reps} reps` : ''}`, label];
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
