import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from '../../hooks/useSortableTable';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  currentDirection: SortDirection;
  onSort: (key: string) => void;
  align?: 'left' | 'right';
  tooltip?: string;
  className?: string;
}

export function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  currentDirection,
  onSort,
  align = 'left',
  tooltip,
  className = '',
}: SortableHeaderProps) {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      className={`py-2 px-3 text-gray-500 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1 group relative">
        {label}
        <span className={`transition-opacity ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}>
          {isActive ? (
            currentDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3" />
            ) : (
              <ArrowDown className="w-3 h-3" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3" />
          )}
        </span>
        {tooltip && (
          <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-normal text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
            {tooltip}
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900" />
          </span>
        )}
      </span>
    </th>
  );
}
