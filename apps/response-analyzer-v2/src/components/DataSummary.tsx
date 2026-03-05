import { FileText, MessageSquare, Globe, X } from 'lucide-react';
import type { ResponseRow } from '../types';

interface DataSummaryProps {
  data: ResponseRow[];
  filteredCount: number;
  onClear: () => void;
}

export function DataSummary({ data, filteredCount, onClear }: DataSummaryProps) {
  const uniquePrompts = new Set(data.map(r => r.prompt_id || r.prompt)).size;
  const platforms = [...new Set(data.map(r => r.platform).filter(Boolean))];
  const isFiltered = filteredCount < data.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{isFiltered ? `${filteredCount} / ${data.length}` : data.length}</span> responses
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{uniquePrompts}</span> prompts
            </span>
          </div>
          {platforms.length > 0 && (
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1 flex-wrap">
                {platforms.map(p => (
                  <span key={p} className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      </div>
    </div>
  );
}
