import { BarChart3, Bot, CalendarDays, ClipboardList, Database, PlusCircle, ShieldCheck, ShieldOff, TrendingUp } from 'lucide-react';

const tabs = ['progress', 'general', 'calendar', 'aiResume', 'training', 'records', 'exercises'];

const activeClasses = {
  progress: 'bg-emerald-500 text-slate-950',
  general: 'bg-cyan-500 text-slate-950',
  calendar: 'bg-emerald-500 text-slate-950',
  aiResume: 'bg-amber-300 text-slate-950',
  training: 'bg-emerald-500 text-slate-950',
  records: 'bg-cyan-500 text-slate-950',
  exercises: 'bg-purple-500 text-slate-950',
  mode: 'bg-amber-400 text-slate-950',
};

const tabLabels = {
  progress: 'Progreso',
  general: 'General',
  calendar: 'Calendario',
  aiResume: 'AI Resume',
  training: 'Añadir',
  records: 'Registros',
  exercises: 'Ejercicios',
};

export default function TabNav({ activeTab, canEdit, onTabChange, onModeSelect }) {
  const visibleTabs = canEdit ? tabs : tabs.filter((tab) => tab !== 'training');

  return (
    <div className="flex justify-start md:justify-center mb-6 overflow-x-auto no-scrollbar">
      <div className="bg-slate-900 p-1.5 rounded-xl border border-slate-800 inline-flex min-w-fit">
        {visibleTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-5 sm:px-8 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 capitalize ${
              activeTab === tab ? `${activeClasses[tab]} shadow-lg` : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'progress' && <TrendingUp size={16} strokeWidth={2.5} />}
            {tab === 'general' && <BarChart3 size={16} strokeWidth={2.5} />}
            {tab === 'calendar' && <CalendarDays size={16} strokeWidth={2.5} />}
            {tab === 'aiResume' && <Bot size={16} strokeWidth={2.5} />}
            {tab === 'training' && <PlusCircle size={16} strokeWidth={2.5} />}
            {tab === 'records' && <ClipboardList size={16} strokeWidth={2.5} />}
            {tab === 'exercises' && <Database size={16} strokeWidth={2.5} />}
            {tabLabels[tab]}
          </button>
        ))}
        <button
          onClick={onModeSelect}
          className={`px-5 sm:px-8 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            canEdit ? `${activeClasses.mode} shadow-lg` : 'text-slate-400 hover:text-white'
          }`}
        >
          {canEdit ? <ShieldOff size={16} strokeWidth={2.5} /> : <ShieldCheck size={16} strokeWidth={2.5} />}
          {canEdit ? 'Lectura' : 'Edición'}
        </button>
      </div>
    </div>
  );
}
