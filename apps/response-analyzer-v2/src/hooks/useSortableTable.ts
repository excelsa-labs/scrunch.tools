import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  direction: SortDirection;
}

export interface UseSortableTableReturn<T, K extends string> {
  sortedData: T[];
  sortKey: K;
  sortDirection: SortDirection;
  onSort: (key: K) => void;
}

export function useSortableTable<T, K extends string>(
  data: T[],
  defaultSortKey: K,
  defaultDirection: SortDirection = 'desc',
  accessor: (item: T, key: K) => string | number = (item, key) => {
    const val = (item as Record<string, unknown>)[key];
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return val.toLowerCase();
    return '';
  }
): UseSortableTableReturn<T, K> {
  const [sort, setSort] = useState<SortState<K>>({
    key: defaultSortKey,
    direction: defaultDirection,
  });

  const onSort = useCallback((key: K) => {
    setSort(prev =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' }
    );
  }, []);

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const aVal = accessor(a, sort.key);
      const bVal = accessor(b, sort.key);

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sort, accessor]);

  return {
    sortedData,
    sortKey: sort.key,
    sortDirection: sort.direction,
    onSort,
  };
}
