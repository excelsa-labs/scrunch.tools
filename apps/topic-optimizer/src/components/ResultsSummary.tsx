import { TopicResult } from '../engine/types';
import { Scissors, Shield, Globe } from 'lucide-react';

interface ResultsSummaryProps {
  results: TopicResult[];
  onSelectTopic: (idx: number) => void;
}

export function ResultsSummary({ results, onSelectTopic }: ResultsSummaryProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {results.map((r, i) => {
        const nKept = r.manifest.filter(m => m.status === 'KEPT').length;
        const nCut = r.manifest.filter(m => m.status === 'CUT').length;
        const coveragePct = (r.selectedCoverage * 100).toFixed(1);
        const resiliencePct = (r.selectedResilience * 100).toFixed(1);

        return (
          <button
            key={r.topicId}
            onClick={() => onSelectTopic(i)}
            className="text-left bg-white rounded-lg border border-gray-200 p-4 hover:border-violet-400 hover:shadow-md transition-all"
          >
            <h3 className="font-semibold text-gray-900 mb-2 truncate">{r.topicName}</h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Scissors className="w-3.5 h-3.5 text-violet-500" />
                <span><strong>{nKept}</strong> kept / <strong>{nCut}</strong> cut of {r.nPrompts}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Globe className="w-3.5 h-3.5 text-blue-500" />
                <span>Coverage: {coveragePct}%</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-3.5 h-3.5 text-green-500" />
                <span>Resilience: {resiliencePct}%</span>
              </div>
              <div className="text-xs text-gray-400">
                Strategy: {r.selectedStrategy}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
