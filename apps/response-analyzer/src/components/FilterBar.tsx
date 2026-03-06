import { useState, useRef, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { FilterState } from '../types';

interface PromptOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  available: {
    platforms: string[];
    stages: string[];
    countries: string[];
    prompts: PromptOption[];
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

function PromptSelect({
  options,
  selected,
  onChange,
}: {
  options: PromptOption[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  if (options.length === 0) return null;

  const unselected = options.filter(o => !selected.includes(o.key));
  const filtered = unselected.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const selectedOptions = selected
    .map(key => options.find(o => o.key === key))
    .filter(Boolean) as PromptOption[];

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
      >
        <span>Prompt{selected.length > 0 ? ` (${selected.length})` : ''}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-96 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={inputRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prompts…"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:border-teal-400"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {selected.length > 0 && (
              <button
                onClick={() => { onChange([]); setIsOpen(false); setSearch(''); }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-gray-100"
              >
                Clear all selected
              </button>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-400 text-center">
                {search ? 'No prompts match your search' : 'All prompts selected'}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onChange([...selected, opt.key]); setSearch(''); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-teal-50 text-gray-700 leading-snug"
                  title={opt.label}
                >
                  <span className="line-clamp-2">{opt.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap max-w-sm">
          {selectedOptions.map(opt => (
            <span
              key={opt.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-teal-50 text-teal-700 max-w-xs"
              title={opt.label}
            >
              <span className="truncate">{opt.label}</span>
              <button
                onClick={() => onChange(selected.filter(s => s !== opt.key))}
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
        <PromptSelect
          options={available.prompts}
          selected={filters.promptIds}
          onChange={(promptIds) => onFiltersChange({ ...filters, promptIds })}
        />
      </div>
    </div>
  );
}
