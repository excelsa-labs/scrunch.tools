import { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  available: {
    platforms: string[];
    stages: string[];
    countries: string[];
    prompts: string[];
  };
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="relative">
      <select
        value=""
        onChange={(e) => {
          const val = e.target.value;
          if (val === '__clear__') {
            onChange([]);
          } else if (val && !selected.includes(val)) {
            onChange([...selected, val]);
          }
        }}
        className="px-3 py-1.5 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
      >
        <option value="">
          {label} {selected.length > 0 ? `(${selected.length})` : ''}
        </option>
        {selected.length > 0 && (
          <option value="__clear__">Clear filter</option>
        )}
        {options.map(opt => (
          <option key={opt} value={opt} disabled={selected.includes(opt)}>
            {selected.includes(opt) ? `✓ ${opt}` : opt}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {selected.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-teal-50 text-teal-700"
            >
              {val}
              <button
                onClick={() => onChange(selected.filter(s => s !== val))}
                className="hover:text-teal-900"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (options.length === 0) return null;

  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg ${
          selected.length > 0
            ? 'border-teal-400 bg-teal-50 text-teal-700'
            : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-72">
          {options.length > 8 && (
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search prompts…"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:outline-none"
                autoFocus
              />
            </div>
          )}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100">
            <button
              onClick={() => onChange([...new Set([...selected, ...filtered])])}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Select all
            </button>
            <button
              onClick={() => onChange([])}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">No results</p>
            ) : (
              filtered.map(opt => (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={e => {
                      if (e.target.checked) {
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter(s => s !== opt));
                      }
                    }}
                    className="rounded text-teal-600 focus:ring-teal-500 flex-shrink-0"
                  />
                  <span className="truncate" title={opt}>{opt}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {selected.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-teal-50 text-teal-700 max-w-[220px]"
            >
              <span className="truncate">{val}</span>
              <button
                onClick={() => onChange(selected.filter(s => s !== val))}
                className="hover:text-teal-900 flex-shrink-0"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ filters, onFiltersChange, available }: FilterBarProps) {
  const hasAnyFilters =
    available.platforms.length > 0 ||
    available.stages.length > 0 ||
    available.countries.length > 0 ||
    available.prompts.length > 0;

  if (!hasAnyFilters) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          <span>Filters:</span>
        </div>
        <MultiSelect
          label="Platform"
          options={available.platforms}
          selected={filters.platforms}
          onChange={(platforms) => onFiltersChange({ ...filters, platforms })}
        />
        <MultiSelect
          label="Stage"
          options={available.stages}
          selected={filters.stages}
          onChange={(stages) => onFiltersChange({ ...filters, stages })}
        />
        <MultiSelect
          label="Country"
          options={available.countries}
          selected={filters.countries}
          onChange={(countries) => onFiltersChange({ ...filters, countries })}
        />
        <ChecklistFilter
          label="Prompt"
          options={available.prompts}
          selected={filters.promptIds}
          onChange={(promptIds) => onFiltersChange({ ...filters, promptIds })}
        />
      </div>
    </div>
  );
}
