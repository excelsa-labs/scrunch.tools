import { useState, useMemo } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { segmentByPhrase } from '../utils/highlightText';
import type { ResponseRow } from '../types';

interface ResponseViewerProps {
  phrase: string;
  data: ResponseRow[];
  /** Optional context label shown beneath the phrase, e.g. "chatgpt" or a prompt excerpt */
  subtitle?: string;
  onClose: () => void;
}

const PAGE_SIZE = 20;

const platformColors: Record<string, string> = {
  chatgpt: 'bg-green-100 text-green-700',
  claude: 'bg-orange-100 text-orange-700',
  perplexity: 'bg-blue-100 text-blue-700',
  google_ai_overviews: 'bg-red-100 text-red-700',
  google_gemini: 'bg-red-100 text-red-700',
  google_ai_mode: 'bg-red-100 text-red-700',
  meta: 'bg-indigo-100 text-indigo-700',
};

export function ResponseViewer({ phrase, data, subtitle, onClose }: ResponseViewerProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const matchingResponses = useMemo(() => {
    const lowerPhrase = phrase.toLowerCase();
    return data.filter(row =>
      row.response_text && row.response_text.toLowerCase().includes(lowerPhrase)
    );
  }, [data, phrase]);

  const visibleResponses = matchingResponses.slice(0, visibleCount);
  const hasMore = visibleCount < matchingResponses.length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-gray-900">Response Viewer</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              <span className="font-medium text-teal-600">"{phrase}"</span>
              {subtitle && (
                <span className="text-gray-400"> · <span className="text-gray-600">{subtitle}</span></span>
              )}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {matchingResponses.length.toLocaleString()} matching response{matchingResponses.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Response list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {visibleResponses.map((row, idx) => {
            const segments = segmentByPhrase(row.response_text, phrase);
            const platformClass = platformColors[row.platform?.toLowerCase()] || 'bg-gray-100 text-gray-700';

            return (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Response metadata */}
                <div className="bg-gray-50 px-4 py-2 flex items-center gap-2 flex-wrap text-xs">
                  {row.platform && (
                    <span className={`px-2 py-0.5 rounded-full font-medium ${platformClass}`}>
                      {row.platform}
                    </span>
                  )}
                  {row.stage && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                      {row.stage}
                    </span>
                  )}
                  {row.prompt && (
                    <span className="text-gray-500 truncate max-w-md" title={row.prompt}>
                      {row.prompt.length > 80 ? row.prompt.slice(0, 80) + '...' : row.prompt}
                    </span>
                  )}
                </div>

                {/* Response text with highlighting */}
                <div className="px-4 py-3 text-sm text-gray-700 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {segments.map((seg, sIdx) =>
                    seg.highlight ? (
                      <mark key={sIdx} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5">
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={sIdx}>{seg.text}</span>
                    )
                  )}
                </div>
              </div>
            );
          })}

          {hasMore && (
            <button
              onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
              className="w-full py-3 text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center justify-center gap-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
              Load more ({matchingResponses.length - visibleCount} remaining)
            </button>
          )}

          {matchingResponses.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              No responses found containing this phrase.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
