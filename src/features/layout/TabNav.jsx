import { BarChart3, CalendarDays, Database, PlusCircle, TrendingUp } from 'lucide-react';

const tabs = ['progress', 'general', 'calendar', 'training', 'exercises'];

const activeClasses = {
  progress: 'bg-emerald-500 text-slate-950',
  general: 'bg-cyan-500 text-slate-950',
  calendar: 'bg-emerald-500 text-slate-950',
  training: 'bg-emerald-500 text-slate-950',
  exercises: 'bg-purple-500 text-slate-950',
};

export default function TabNav({ activeTab, onTabChange }) {
  return (
    <div className="flex justify-start md:justify-center mb-6 overflow-x-auto no-scrollbar">
      <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 inline-flex min-w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 sm:px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 capitalize ${
              activeTab === tab ? `${activeClasses[tab]} shadow-lg` : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab === 'progress' && <TrendingUp size={16} strokeWidth={2.5} />}
            {tab === 'general' && <BarChart3 size={16} strokeWidth={2.5} />}
            {tab === 'calendar' && <CalendarDays size={16} strokeWidth={2.5} />}
            {tab === 'training' && <PlusCircle size={16} strokeWidth={2.5} />}
            {tab === 'exercises' && <Database size={16} strokeWidth={2.5} />}
            {tab === 'general' ? 'General' : tab === 'calendar' ? 'Calendario' : tab === 'training' ? 'Añadir' : tab}
          </button>
        ))}
      </div>
    </div>
  );
}
