import { useState, useMemo, useCallback, Fragment } from 'react';
import { ChevronDown, ChevronRight, Eye, BarChart2, Table, Download } from 'lucide-react';
import { extractNgrams } from '../utils/textAnalysis';
import { searchPhrases, aggregateByDimension } from '../utils/phraseSearch';
import { exportTopPhrasesCSV } from '../utils/exportUtils';
import { SortableHeader } from './ui/SortableHeader';
import { useSortableTable } from '../hooks/useSortableTable';
import { PhraseBarChart } from './PhraseBarChart';
import { BreakdownBarChart } from './BreakdownBarChart';
import { InlineResponsePreview } from './InlineResponsePreview';
import type { ResponseRow, NgramResult } from '../types';

interface TopPhrasesProps {
  data: ResponseRow[];
  onViewResponses?: (phrase: string, data?: ResponseRow[], subtitle?: string) => void;
}

type NgramSortKey = 'phrase' | 'count' | 'responseCount' | 'responsePercent';
type ViewMode = 'table' | 'chart';

const CHART_TOP_N_OPTIONS = [5, 10, 15, 20];

export function TopPhrases({ data, onViewResponses }: TopPhrasesProps) {
  const [ngramSize, setNgramSize] = useState(2);
  const [topN, setTopN] = useState(25);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartTopN, setChartTopN] = useState(10);
  const [expandedPhrase, setExpandedPhrase] = useState<string | null>(null);
  const [pivotDimension, setPivotDimension] = useState<string>('');
  const [breakdownViewMode, setBreakdownViewMode] = useState<ViewMode>('table');

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

  const handleBarClick = useCallback((phrase: string) => {
    setExpandedPhrase(prev => prev === phrase ? null : phrase);
    setViewMode('table');
  }, []);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No data to analyze. Adjust your filters or upload a CSV.</p>;
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        {/* N-gram slider */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Phrase length:</span>
          <input
            type="range"
            min={1}
            max={10}
            value={ngramSize}
            onChange={(e) => setNgramSize(Number(e.target.value))}
            className="w-28 accent-teal-600"
          />
          <input
            type="number"
            min={1}
            max={10}
            value={ngramSize}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, Number(e.target.value)));
              if (!isNaN(v)) setNgramSize(v);
            }}
            className="w-14 px-2 py-1 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">{ngramSize === 1 ? 'word' : 'words'}</span>
        </div>

        {/* Top N */}
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

        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden ml-auto">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1 flex items-center gap-1.5 text-sm font-medium ${
              viewMode === 'table' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Table view"
          >
            <Table className="w-3.5 h-3.5" />
            Table
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1 flex items-center gap-1.5 text-sm font-medium border-l border-gray-300 ${
              viewMode === 'chart' ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title="Chart view"
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Chart
          </button>
        </div>

        {/* Export */}
        <button
          onClick={() => exportTopPhrasesCSV(sortedData, ngramSize)}
          className="flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
          title="Export as CSV"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {ngrams.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No phrases found. Try adjusting the phrase length.</p>
      ) : viewMode === 'chart' ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Chart shows top:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {CHART_TOP_N_OPTIONS.map((n, idx) => (
                <button
                  key={n}
                  onClick={() => setChartTopN(n)}
                  className={`px-3 py-1 text-sm font-medium ${idx > 0 ? 'border-l border-gray-300' : ''} ${
                    chartTopN === n ? 'bg-teal-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 ml-2">Click a bar to expand in table view</span>
          </div>
          <PhraseBarChart data={sortedData} topN={chartTopN} onBarClick={handleBarClick} />
        </div>
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
                        {/* Eye icon + view all */}
                        {onViewResponses && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onViewResponses(ngram.phrase); }}
                            className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium mb-3"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View all {ngram.responseCount} matching responses
                          </button>
                        )}

                        {/* Pivot selector + breakdown view toggle */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          {availableDimensions.length > 0 && (
                            <>
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
                            </>
                          )}
                          <div className="flex rounded border border-gray-300 overflow-hidden ml-auto">
                            <button
                              onClick={(e) => { e.stopPropagation(); setBreakdownViewMode('table'); }}
                              className={`px-2 py-0.5 flex items-center gap-1 text-xs font-medium ${
                                breakdownViewMode === 'table' ? 'bg-teal-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                              title="Table view"
                            >
                              <Table className="w-3 h-3" />
                              Table
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setBreakdownViewMode('chart'); }}
                              className={`px-2 py-0.5 flex items-center gap-1 text-xs font-medium border-l border-gray-300 ${
                                breakdownViewMode === 'chart' ? 'bg-teal-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                              title="Chart view"
                            >
                              <BarChart2 className="w-3 h-3" />
                              Chart
                            </button>
                          </div>
                        </div>

                        {/* Per-prompt breakdown */}
                        {!pivotDimension && expandedDetail && (
                          breakdownViewMode === 'chart' ? (
                            <BreakdownBarChart
                              data={expandedDetail.perPrompt.slice(0, 10).map(p => ({
                                label: p.promptText,
                                percent: p.percent,
                                count: p.containsCount,
                                total: p.totalResponses,
                              }))}
                            />
                          ) : (
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
                                  {expandedDetail.perPrompt.slice(0, 10).map(p => (
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
                          )
                        )}

                        {/* Pivot breakdown */}
                        {pivotDimension && pivotData && (
                          breakdownViewMode === 'chart' ? (
                            <BreakdownBarChart
                              data={pivotData.slice(0, 10).map(d => ({
                                label: d.groupValue,
                                percent: d.percent,
                                count: d.containsCount,
                                total: d.totalResponses,
                              }))}
                            />
                          ) : (
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
                                  {pivotData.slice(0, 10).map(d => (
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
                          )
                        )}

                        {/* Inline response preview */}
                        {!pivotDimension && (
                          <InlineResponsePreview
                            phrase={ngram.phrase}
                            responses={data}
                            maxPreviews={3}
                            onViewAll={onViewResponses ? () => onViewResponses(ngram.phrase) : undefined}
                          />
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
