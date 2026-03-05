import { useState, useMemo, useCallback, Fragment } from 'react';
import { ChevronDown, ChevronRight, Eye } from 'lucide-react';
import { extractNgrams } from '../utils/textAnalysis';
import { searchPhrases, aggregateByDimension } from '../utils/phraseSearch';
import { SortableHeader } from './ui/SortableHeader';
import { useSortableTable } from '../hooks/useSortableTable';
import type { ResponseRow, NgramResult } from '../types';

interface TopPhrasesProps {
  data: ResponseRow[];
  onViewResponses?: (phrase: string, data?: ResponseRow[], subtitle?: string) => void;
}

type NgramSortKey = 'phrase' | 'count' | 'responseCount' | 'responsePercent';

export function TopPhrases({ data, onViewResponses }: TopPhrasesProps) {
  const [ngramSize, setNgramSize] = useState<2 | 3>(2);
  const [topN, setTopN] = useState(25);
  const [expandedPhrase, setExpandedPhrase] = useState<string | null>(null);
  const [pivotDimension, setPivotDimension] = useState<string>('');

  const ngrams = useMemo(
    () => extractNgrams(data, ngramSize, topN),
    [data, ngramSize, topN]
  );

  const { sortedData, sortKey, sortDirection, onSort } = useSortableTable<NgramResult, NgramSortKey>(
    ngrams,
    'responsePercent',
    'desc'
  );

  const expandedDetail = useMemo(() => {
    if (!expandedPhrase || pivotDimension) return null;
    return searchPhrases(data, [expandedPhrase])[0];
  }, [data, expandedPhrase, pivotDimension]);

  const pivotData = useMemo(() => {
    if (!expandedPhrase || !pivotDimension) return null;
    return aggregateByDimension(data, expandedPhrase, pivotDimension);
  }, [data, expandedPhrase, pivotDimension]);

  const availableDimensions = useMemo(() => {
    const dims: { key: string; label: string }[] = [];
    if (data.some(r => r.platform)) dims.push({ key: 'platform', label: 'Platform' });
    if (data.some(r => r.stage)) dims.push({ key: 'stage', label: 'Stage' });
    if (data.some(r => r.country)) dims.push({ key: 'country', label: 'Country' });
    return dims;
  }, [data]);

  const handleViewForPrompt = useCallback((e: React.MouseEvent, phrase: string, promptKey: string, promptText: string) => {
    e.stopPropagation();
    const subset = data.filter(r => (r.prompt_id || r.prompt) === promptKey);
    const label = promptText.length > 60 ? promptText.slice(0, 60) + '…' : promptText;
    onViewResponses?.(phrase, subset, label);
  }, [data, onViewResponses]);

  const handleViewForPivot = useCallback((e: React.MouseEvent, phrase: string, dimension: string, groupValue: string) => {
    e.stopPropagation();
    const subset = data.filter(r => (r as Record<string, string>)[dimension] === groupValue);
    onViewResponses?.(phrase, subset, groupValue);
  }, [data, onViewResponses]);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No data to analyze. Adjust your filters or upload a CSV.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Phrase length:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setNgramSize(2)}
              className={`px-3 py-1 text-sm font-medium ${
                ngramSize === 2 ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              2-word
            </button>
            <button
              onClick={() => setNgramSize(3)}
              className={`px-3 py-1 text-sm font-medium border-l border-gray-300 ${
                ngramSize === 3 ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              3-word
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Show top:</span>
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
          >
            {[10, 25, 50, 100].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {ngrams.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No phrases found. Try adjusting the phrase length.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 font-medium w-10">#</th>
                <SortableHeader
                  label="Phrase"
                  sortKey="phrase"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  tooltip="The extracted n-gram phrase found across AI responses"
                />
                <SortableHeader
                  label="Occurrences"
                  sortKey="count"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  align="right"
                  tooltip="Total number of times this phrase appears (a single response may contain it multiple times)"
                />
                <SortableHeader
                  label="Responses"
                  sortKey="responseCount"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  align="right"
                  tooltip="Number of unique AI responses that contain this phrase at least once"
                />
                <SortableHeader
                  label="% of Responses"
                  sortKey="responsePercent"
                  currentSortKey={sortKey}
                  currentDirection={sortDirection}
                  onSort={onSort}
                  align="right"
                  tooltip="Percentage of filtered responses that mention this phrase — higher means more consistent adoption"
                />
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((ngram, i) => (
                <Fragment key={ngram.phrase}>
                  <tr
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedPhrase(expandedPhrase === ngram.phrase ? null : ngram.phrase)}
                  >
                    <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                    <td className="py-2 px-3 font-medium text-gray-900">{ngram.phrase}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{ngram.count.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-gray-600">{ngram.responseCount.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      <span className="inline-flex items-center">
                        <span className="w-16 h-1.5 bg-gray-200 rounded-full mr-2 inline-block">
                          <span
                            className="h-full bg-teal-500 rounded-full block"
                            style={{ width: `${Math.min(ngram.responsePercent, 100)}%` }}
                          />
                        </span>
                        <span className="font-medium text-gray-900">{ngram.responsePercent.toFixed(1)}%</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      {expandedPhrase === ngram.phrase ? (
                        <ChevronDown className="w-4 h-4 text-gray-400 inline" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 inline" />
                      )}
                    </td>
                  </tr>

                  {expandedPhrase === ngram.phrase && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-6 py-3">
                        {/* Pivot selector */}
                        {availableDimensions.length > 0 && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs text-gray-500">View by:</span>
                            <select
                              value={pivotDimension}
                              onChange={(e) => setPivotDimension(e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">Per prompt</option>
                              {availableDimensions.map(d => (
                                <option key={d.key} value={d.key}>{d.label}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {/* Per-prompt breakdown */}
                        {!pivotDimension && expandedDetail && (
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400">
                                  <th className="text-left py-1 pr-3">Prompt</th>
                                  <th className="text-right py-1 px-2">Matches</th>
                                  <th className="text-right py-1 px-2">Total</th>
                                  <th className="text-right py-1 px-2">%</th>
                                  {onViewResponses && <th className="w-6"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {expandedDetail.perPrompt.map(p => (
                                  <tr key={p.promptKey} className="border-t border-gray-200 hover:bg-gray-100 group">
                                    <td className="py-1 pr-3 text-gray-700 max-w-xs truncate" title={p.promptText}>
                                      {p.promptText.length > 80 ? p.promptText.slice(0, 80) + '...' : p.promptText}
                                    </td>
                                    <td className="py-1 px-2 text-right text-gray-600">{p.containsCount}</td>
                                    <td className="py-1 px-2 text-right text-gray-600">{p.totalResponses}</td>
                                    <td className="py-1 px-2 text-right font-medium text-gray-900">{p.percent.toFixed(1)}%</td>
                                    {onViewResponses && (
                                      <td className="py-1 pl-1">
                                        <button
                                          onClick={(e) => handleViewForPrompt(e, ngram.phrase, p.promptKey, p.promptText)}
                                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-teal-100 transition-all"
                                          title="View matching responses for this prompt"
                                        >
                                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Pivot breakdown */}
                        {pivotDimension && pivotData && (
                          <div className="max-h-60 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400">
                                  <th className="text-left py-1 pr-3 capitalize">{pivotDimension}</th>
                                  <th className="text-right py-1 px-2">Matches</th>
                                  <th className="text-right py-1 px-2">Total</th>
                                  <th className="text-right py-1 px-2">%</th>
                                  {onViewResponses && <th className="w-6"></th>}
                                </tr>
                              </thead>
                              <tbody>
                                {pivotData.map(d => (
                                  <tr key={d.groupValue} className="border-t border-gray-200 hover:bg-gray-100 group">
                                    <td className="py-1 pr-3 text-gray-700">{d.groupValue}</td>
                                    <td className="py-1 px-2 text-right text-gray-600">{d.containsCount}</td>
                                    <td className="py-1 px-2 text-right text-gray-600">{d.totalResponses}</td>
                                    <td className="py-1 px-2 text-right font-medium text-gray-900">{d.percent.toFixed(1)}%</td>
                                    {onViewResponses && (
                                      <td className="py-1 pl-1">
                                        <button
                                          onClick={(e) => handleViewForPivot(e, ngram.phrase, pivotDimension, d.groupValue)}
                                          className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-teal-100 transition-all"
                                          title={`View responses for ${pivotDimension}: ${d.groupValue}`}
                                        >
                                          <Eye className="w-3.5 h-3.5 text-teal-600" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
