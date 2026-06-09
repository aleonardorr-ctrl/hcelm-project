import { useState, useEffect, useRef } from 'react';

interface SearchInputProps {
  endpoint: string;
  placeholder: string;
  onSelect: (item: any) => void;
  displayKey: string;
  token: string | null;
}

export default function SearchInput({ endpoint, placeholder, onSelect, displayKey, token }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda con debounce (espera 300ms después de escribir)
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3000${endpoint}?q=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      } catch (err) {
        console.error('Error en búsqueda:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, endpoint, token]);

  const handleSelect = (item: any) => {
    onSelect(item);
    setQuery(item[displayKey] || item.code || item.fullName);
    setShowResults(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setShowResults(true)}
        placeholder={placeholder}
        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
      {loading && <div className="absolute right-3 top-2 text-slate-400 text-sm">⏳</div>}
      
      {showResults && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {results.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
            >
              <span className="font-medium text-slate-800">
                {item.code && <span className="text-blue-600 mr-2">{item.code}</span>}
                {item[displayKey]}
              </span>
              {item.chapter && <span className="block text-xs text-slate-500">{item.chapter}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}