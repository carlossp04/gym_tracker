import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  icon: Icon,
  align = 'left',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) setSearchTerm('');
        }}
        className={`w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-slate-700 transition-colors group ${align === 'center' ? 'justify-center' : 'justify-between'}`}
      >
        <div className={`flex items-center gap-3 overflow-hidden ${align === 'center' ? 'mx-auto' : ''}`}>
          {Icon && <Icon size={18} className="text-emerald-500 flex-shrink-0" />}
          <span className={`truncate ${!value ? 'text-slate-500' : 'font-bold text-lg'}`}>
            {value || placeholder}
          </span>
        </div>
        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top max-h-60 flex flex-col">
          <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar..."
                autoFocus
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="overflow-y-auto custom-scrollbar p-1 flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    value === option
                      ? 'bg-emerald-500/10 text-emerald-400 font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {value === option && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-xs text-slate-500">No se encontraron resultados</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
