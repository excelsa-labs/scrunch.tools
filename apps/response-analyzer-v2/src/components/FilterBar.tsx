import { Filter } from 'lucide-react';
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

export function FilterBar({ filters, onFiltersChange, available }: FilterBarProps) {
  const hasAnyFilters = available.platforms.length > 0 || available.stages.length > 0 || available.countries.length > 0;

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
      </div>
    </div>
  );
}
