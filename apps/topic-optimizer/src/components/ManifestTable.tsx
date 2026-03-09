import { useState, useMemo } from 'react';
import { ManifestRow } from '../engine/types';
import { ChevronUp, ChevronDown, Search } from 'lucide-react';

interface ManifestTableProps {
  manifest: ManifestRow[];
}

type SortKey = 'promptId' | 'promptText' | 'status' | 'nUrls';
type SortDir = 'asc' | 'desc';

export function ManifestTable({ manifest }: ManifestTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('status');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filter, setFilter] = useState<'all' | 'KEPT' | 'CUT'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let rows = manifest;
    if (filter !== 'all') rows = rows.filter(r => r.status === filter);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.promptText.toLowerCase().includes(q) || r.promptId.toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      const cmp = typeof aVal === 'number' ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [manifest, filter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-violet-600" />
      : <ChevronDown className="w-3 h-3 text-violet-600" />;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'KEPT', 'CUT'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? `All (${manifest.length})` : `${f} (${manifest.filter(m => m.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('status')}>
                <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
              </th>
              <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('promptId')}>
                <div className="flex items-center gap-1">Prompt ID <SortIcon col="promptId" /></div>
              </th>
              <th className="px-3 py-2 text-left cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('promptText')}>
                <div className="flex items-center gap-1">Prompt Text <SortIcon col="promptText" /></div>
              </th>
              <th className="px-3 py-2 text-right cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('nUrls')}>
                <div className="flex items-center justify-end gap-1">URLs <SortIcon col="nUrls" /></div>
              </th>
              <th className="px-3 py-2 text-left">
                <div className="flex items-center gap-1">Closest Kept Prompt</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((row, i) => (
              <tr key={`${row.promptId}-${i}`} className={row.status === 'CUT' ? 'bg-red-50/50' : ''}>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    row.status === 'KEPT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600 font-mono text-xs">{row.promptId}</td>
                <td className="px-3 py-2 text-gray-900 max-w-md truncate">{row.promptText}</td>
                <td className="px-3 py-2 text-right text-gray-600">{row.nUrls}</td>
                <td className="px-3 py-2 text-xs max-w-sm">
                  {row.status === 'CUT' && row.coveringPrompts.length > 0 ? (
                    <div className="space-y-1">
                      {row.coveringPrompts.map((cp, j) => (
                        <div key={j} className="text-gray-500" title={cp.promptText}>
                          <span className="text-violet-600 font-medium">{cp.sharedUrls} URL{cp.sharedUrls !== 1 ? 's' : ''}</span>
                          {' '}from <span className="font-mono">{cp.promptId}</span>
                          <span className="text-gray-400 ml-1 truncate inline-block max-w-[200px] align-bottom">{cp.promptText}</span>
                        </div>
                      ))}
                      {row.uncoveredUrls > 0 && (
                        <div className="text-orange-500">{row.uncoveredUrls} URL{row.uncoveredUrls !== 1 ? 's' : ''} not covered by any kept prompt</div>
                      )}
                    </div>
                  ) : row.status === 'CUT' ? (
                    <span className="text-gray-300">—</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
