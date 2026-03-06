import { useState, useMemo, useCallback } from 'react';
import { BarChart3, Upload } from 'lucide-react';
import { FileUpload } from './components/FileUpload';
import { ColumnMapper } from './components/ColumnMapper';
import { DataSummary } from './components/DataSummary';
import { FilterBar } from './components/FilterBar';
import { TopPhrases } from './components/TopPhrases';
import { WordCloud } from './components/WordCloud';
import { PhraseSearch } from './components/PhraseSearch';
import { parseCSV, applyColumnMapping } from './utils/csvParser';
import type { ResponseRow, ColumnMapping, FilterState, ParseResult } from './types';

type Tab = 'phrases' | 'wordcloud' | 'search';

function App() {
  const [data, setData] = useState<ResponseRow[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [showColumnMapper, setShowColumnMapper] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('phrases');
  const [filters, setFilters] = useState<FilterState>({
    platforms: [],
    stages: [],
    countries: [],
    promptIds: [],
  });
  const [searchPhrase, setSearchPhrase] = useState('');

  const hasData = data.length > 0;

  const availableFilters = useMemo(() => {
    if (!hasData) return { platforms: [], stages: [], countries: [], prompts: [] as { key: string; label: string }[] };
    const platforms = [...new Set(data.map(r => r.platform).filter(Boolean))].sort();
    const stages = [...new Set(data.map(r => r.stage).filter(Boolean))].sort();
    const countries = [...new Set(data.map(r => r.country).filter(Boolean))].sort();
    // Build a deduped map: key = prompt_id (or prompt text as fallback), label = prompt text
    const promptMap = new Map<string, string>();
    data.forEach(r => {
      const key = r.prompt_id || r.prompt;
      const label = r.prompt || r.prompt_id;
      if (key) promptMap.set(key, label);
    });
    const prompts = [...promptMap.entries()]
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
    return { platforms, stages, countries, prompts };
  }, [data, hasData]);

  const filteredData = useMemo(() => {
    if (!hasData) return [];
    return data.filter(row => {
      if (filters.platforms.length > 0 && !filters.platforms.includes(row.platform)) return false;
      if (filters.stages.length > 0 && !filters.stages.includes(row.stage)) return false;
      if (filters.countries.length > 0 && !filters.countries.includes(row.country)) return false;
      if (filters.promptIds.length > 0) {
        const rowPromptKey = row.prompt_id || row.prompt;
        if (!filters.promptIds.includes(rowPromptKey)) return false;
      }
      return true;
    });
  }, [data, filters, hasData]);

  const handleCSVLoaded = useCallback((rawText: string) => {
    const result = parseCSV(rawText);
    setParseResult(result);

    if (!result.detectedMapping.prompt || !result.detectedMapping.response_text) {
      setShowColumnMapper(true);
    } else {
      const rows = applyColumnMapping(result.rows, result.detectedMapping);
      setData(rows);
    }
  }, []);

  const handleColumnMappingApply = useCallback((mapping: ColumnMapping) => {
    if (!parseResult) return;
    const rows = applyColumnMapping(parseResult.rows, mapping);
    setData(rows);
    setShowColumnMapper(false);
  }, [parseResult]);

  const handleClear = useCallback(() => {
    setData([]);
    setParseResult(null);
    setFilters({ platforms: [], stages: [], countries: [], promptIds: [] });
    setActiveTab('phrases');
    setSearchPhrase('');
  }, []);

  const handleWordClick = useCallback((word: string) => {
    setSearchPhrase(word);
    setActiveTab('search');
  }, []);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'phrases', label: 'Top Phrases' },
    { key: 'wordcloud', label: 'Word Cloud' },
    { key: 'search', label: 'Phrase Search' },
  ];

  return (
    <>
      {showColumnMapper && parseResult && (
        <ColumnMapper
          headers={parseResult.headers}
          detectedMapping={parseResult.detectedMapping}
          onApply={handleColumnMappingApply}
          onCancel={() => { setShowColumnMapper(false); setParseResult(null); }}
        />
      )}
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-4">
              <a href="/">
                <img src={`${import.meta.env.BASE_URL}scrunch-logo.svg`} alt="Scrunch" className="h-8" />
              </a>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                <span className="text-sm font-medium text-gray-900">Response Analyzer</span>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {!hasData ? (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-teal-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Response Analyzer</h1>
                <p className="text-gray-500">Upload a Scrunch Responses API CSV export to analyze phrase frequency, word patterns, and messaging presence across AI responses.</p>
              </div>
              <FileUpload onCSVLoaded={handleCSVLoaded} />
            </div>
          ) : (
            <div className="space-y-6">
              <DataSummary data={data} filteredCount={filteredData.length} onClear={handleClear} />

              <FilterBar
                filters={filters}
                onFiltersChange={setFilters}
                available={availableFilters}
              />

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200 px-6">
                  <nav className="flex gap-6" aria-label="Tabs">
                    {tabs.map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.key
                            ? 'border-teal-600 text-teal-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'phrases' && (
                    <TopPhrases data={filteredData} />
                  )}
                  {activeTab === 'wordcloud' && (
                    <WordCloud data={filteredData} onWordClick={handleWordClick} />
                  )}
                  {activeTab === 'search' && (
                    <PhraseSearch
                      data={filteredData}
                      initialPhrase={searchPhrase}
                      onInitialPhraseConsumed={() => setSearchPhrase('')}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default App;
