import { ClipboardList, House, LayoutTemplate, TrendingUp } from 'lucide-react';

const tabs = [
  { id: 'today', label: 'Hoy', icon: House, children: ['training'] },
  { id: 'routines', label: 'Rutinas', icon: LayoutTemplate, children: [] },
  { id: 'records', label: 'Historial', icon: ClipboardList, children: ['calendar'] },
  { id: 'progress', label: 'Progreso', icon: TrendingUp, children: ['general'] },
];

export default function TabNav({ activeTab, onTabChange }) {
  return <nav aria-label="Navegación principal" className="fixed bottom-0 inset-x-0 z-30 border-t border-slate-700 bg-slate-900/95 backdrop-blur md:static md:rounded-2xl md:border md:mb-6 pb-[env(safe-area-inset-bottom)]"><div className="grid grid-cols-4 max-w-3xl mx-auto gap-1 p-2">
    {tabs.map(({ id, label, icon, children }) => {
      const Icon = icon;
      const active = activeTab === id || children.includes(activeTab);
      return <button key={id} type="button" aria-current={active ? 'page' : undefined} onClick={() => onTabChange(id)} className={`min-h-12 rounded-xl text-xs sm:text-sm font-bold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${active ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'}`}><Icon size={19} />{label}</button>;
    })}
  </div></nav>;
}
