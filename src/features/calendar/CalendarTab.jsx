import { CalendarDays, ChevronLeft, ChevronRight, User, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import SearchableSelect from '../../components/SearchableSelect';

const ALL_USERS_OPTION = 'Todos los usuarios';
const weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const monthFormatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

export default function CalendarTab({ processedData, availableUsers, userColors }) {
  const [selectedUser, setSelectedUser] = useState(ALL_USERS_OPTION);
  const [selectedMonthKey, setSelectedMonthKey] = useState('');

  const calendarData = useMemo(() => buildCalendarData(processedData), [processedData]);
  const monthKeys = calendarData.monthKeys;
  const effectiveMonthKey = monthKeys.includes(selectedMonthKey) ? selectedMonthKey : monthKeys[monthKeys.length - 1];
  const selectedMonthIndex = Math.max(0, monthKeys.indexOf(effectiveMonthKey));
  const visibleUsers = selectedUser === ALL_USERS_OPTION ? availableUsers : [selectedUser].filter(Boolean);
  const selectedMonth = effectiveMonthKey ? parseMonthKey(effectiveMonthKey) : new Date();

  const moveMonth = (direction) => {
    const nextIndex = Math.min(Math.max(selectedMonthIndex + direction, 0), monthKeys.length - 1);
    setSelectedMonthKey(monthKeys[nextIndex]);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-3">
          <CalendarDays className="text-emerald-400" size={32} /> Calendario
        </h2>
        <p className="text-slate-400 text-sm">Días con entrenamiento marcado por usuario.</p>
      </div>

      <div className="flex flex-col md:flex-row md:justify-center gap-4 items-stretch">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl w-full md:w-80">
          <label className="block text-xs font-bold text-slate-500 mb-3 uppercase tracking-wider">Usuario</label>
          <SearchableSelect
            options={[ALL_USERS_OPTION, ...availableUsers]}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="Seleccionar usuario..."
            icon={selectedUser === ALL_USERS_OPTION ? Users : User}
          />
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center justify-between gap-4 w-full md:w-[28rem]">
          <button
            onClick={() => moveMonth(-1)}
            disabled={selectedMonthIndex <= 0}
            className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Mes</p>
            <p className="text-white font-black text-xl capitalize">{monthFormatter.format(selectedMonth)}</p>
          </div>
          <button
            onClick={() => moveMonth(1)}
            disabled={selectedMonthIndex >= monthKeys.length - 1}
            className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-4 max-w-3xl mx-auto">
        {visibleUsers.map((user) => {
          const userIndex = availableUsers.indexOf(user);
          const color = userColors[userIndex >= 0 ? userIndex % userColors.length : 0];
          const trainedDays = calendarData.trainedDaysByUser[user] || new Set();

          return (
            <UserCalendar
              key={user}
              user={user}
              color={color}
              month={selectedMonth}
              trainedDays={trainedDays}
            />
          );
        })}
      </div>
    </div>
  );
}

function UserCalendar({ user, color, month, trainedDays }) {
  const weeks = buildMonthGrid(month);
  const trainedCount = weeks.flat().filter((day) => day.inMonth && trainedDays.has(toDateKey(day.date))).length;

  return (
    <section className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-black text-white">{user}</h3>
          <p className="text-xs text-slate-500">{trainedCount} días entrenados este mes</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></span>
          Entreno
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 mb-1.5 max-w-[25rem] mx-auto">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] font-black text-slate-500 uppercase py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 max-w-[25rem] mx-auto">
        {weeks.flat().map((day) => {
          const dateKey = toDateKey(day.date);
          const trained = day.inMonth && trainedDays.has(dateKey);

          return (
            <div
              key={dateKey}
              className={`w-full aspect-square rounded-lg border flex items-center justify-center text-xs font-bold ${
                day.inMonth ? 'border-slate-800 text-slate-300 bg-slate-950' : 'border-slate-900 text-slate-700 bg-slate-950/40'
              }`}
              style={trained ? { backgroundColor: color, borderColor: color, color: '#020617' } : undefined}
              title={trained ? `${user} entrenó el ${dateKey}` : dateKey}
            >
              {day.date.getDate()}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildCalendarData(processedData) {
  const trainedDaysByUser = {};
  const monthKeys = new Set();

  Object.entries(processedData || {}).forEach(([user, entries]) => {
    trainedDaysByUser[user] = new Set();
    entries.forEach((entry) => {
      const date = parseTrainingDate(entry.date);
      trainedDaysByUser[user].add(toDateKey(date));
      monthKeys.add(toMonthKey(date));
    });
  });

  return {
    trainedDaysByUser,
    monthKeys: [...monthKeys].sort(),
  };
}

function buildMonthGrid(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const totalDays = startOffset + lastDay.getDate();
  const cellCount = Math.ceil(totalDays / 7) * 7;
  const startDate = new Date(year, monthIndex, 1 - startOffset);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return {
      date,
      inMonth: date.getMonth() === monthIndex,
    };
  }).reduce((weeks, day, index) => {
    if (index % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
    return weeks;
  }, []);
}

function parseTrainingDate(date) {
  const [day, month, year] = date.split(/[/.-]/).map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  return new Date(fullYear, month - 1, day);
}

function parseMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function toDateKey(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

function toMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
