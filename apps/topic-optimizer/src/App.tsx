import { useState, useCallback, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { ConstraintConfig } from './components/ConstraintConfig';
import { ResultsSummary } from './components/ResultsSummary';
import { ManifestTable } from './components/ManifestTable';
import { FlatnessChart } from './components/FlatnessChart';
import { ParetoChart } from './components/ParetoChart';
import { TrajectoryChart } from './components/TrajectoryChart';
import { TopicSelector } from './components/TopicSelector';
import { parseCSV, ParseResult } from './utils/csvParser';
import { exportManifestCSV, downloadCSV } from './utils/exportUtils';
import { runAnalysis, applySelection, TopicGroup } from './engine/pipeline';
import { ConstraintAxis, TopicAnalysis, TopicResult } from './engine/types';
import { DEFAULT_STRATEGIES } from './engine/strategies';
import { CONSTRAINT_DEFAULTS } from './types';
import { Download, RotateCcw, Info, AlertTriangle } from 'lucide-react';
import { strategyLabel } from './utils/strategyLabels';

function App() {
  const [step, setStep] = useState<'upload' | 'configure' | 'results'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [constraintAxis, setConstraintAxis] = useState<ConstraintAxis>('coverage-floor');
  const [constraintValue, setConstraintValue] = useState(CONSTRAINT_DEFAULTS['coverage-floor']);
  const [strategyOverride, setStrategyOverride] = useState<string>('weighted_50_50');
  const [analyses, setAnalyses] = useState<TopicAnalysis[]>([]);
  const [results, setResults] = useState<TopicResult[]>([]);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [forceTopicIds, setForceTopicIds] = useState<Set<string>>(new Set());

  const constraint = useMemo(() => ({ axis: constraintAxis, value: constraintValue }), [constraintAxis, constraintValue]);

  const handleCSVLoaded = useCallback((rawText: string) => {
    const result = parseCSV(rawText);
    if (result.errors.length > 0) {
      setParseErrors(result.errors);
      return;
    }
    setParseResult(result);
    setGroups(result.groups);
    setParseErrors([]);
    setStep('configure');
  }, []);

  const handleRun = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const newAnalyses = runAnalysis(groups);
      const newResults = applySelection(newAnalyses, constraint, strategyOverride, forceTopicIds);
      setAnalyses(newAnalyses);
      setResults(newResults);
      setSelectedTopicIdx(0);
      setStep('results');
      setRunning(false);
    }, 50);
  }, [groups, constraint, strategyOverride, forceTopicIds]);

  // Instant re-selection when strategy changes on results page
  const handleStrategyChangeOnResults = useCallback((newStrategy: string) => {
    setStrategyOverride(newStrategy);
    const newResults = applySelection(analyses, constraint, newStrategy, forceTopicIds);
    setResults(newResults);
  }, [analyses, constraint, forceTopicIds]);

  const handleForceOverride = useCallback((topicId: string) => {
    const updated = new Set(forceTopicIds);
    updated.add(topicId);
    setForceTopicIds(updated);
    const newResults = applySelection(analyses, constraint, strategyOverride, updated);
    setResults(newResults);
  }, [forceTopicIds, analyses, constraint, strategyOverride]);

  const handleExport = useCallback(() => {
    const csv = exportManifestCSV(results, { constraint, strategy: strategyOverride });
    downloadCSV(csv, 'topic_optimizer_manifest.csv');
  }, [results, constraint, strategyOverride]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParseResult(null);
    setGroups([]);
    setAnalyses([]);
    setResults([]);
    setParseErrors([]);
    setStrategyOverride('weighted_50_50');
    setForceTopicIds(new Set());
  }, []);

  const selectedResult = results[selectedTopicIdx];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex-shrink-0">
              <img src="/topic-optimizer/scrunch-logo.svg" alt="Scrunch" className="h-7" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </a>
            <h1 className="text-lg font-semibold text-gray-900">Topic Optimizer</h1>
          </div>
          {step !== 'upload' && (
            <button onClick={handleReset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <RotateCcw className="w-4 h-4" /> Start Over
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {step === 'upload' && (
          <div className="max-w-xl mx-auto">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Topic Optimizer</h2>
              <p className="text-gray-600">
                Upload a CSV with prompt citations to analyze which prompts can be safely removed
                while preserving URL coverage and resilience.
              </p>
            </div>
            <FileUpload onCSVLoaded={handleCSVLoaded} />
            {parseErrors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800">CSV Errors:</p>
                {parseErrors.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}
              </div>
            )}
          </div>
        )}

        {step === 'configure' && parseResult && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Pruning</h2>
            <ConstraintConfig
              axis={constraintAxis}
              value={constraintValue}
              strategyOverride={strategyOverride}
              onAxisChange={setConstraintAxis}
              onValueChange={setConstraintValue}
              onStrategyChange={setStrategyOverride}
              onRun={handleRun}
              running={running}
              nTopics={parseResult.nTopics}
              nPrompts={parseResult.nPrompts}
              nUrls={parseResult.nUrls}
            />
          </div>
        )}

        {step === 'results' && selectedResult && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">Results</h2>
                <TopicSelector
                  results={results}
                  selectedIdx={selectedTopicIdx}
                  onSelect={setSelectedTopicIdx}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('configure')}
                  className="px-3 py-1.5 text-sm text-violet-600 hover:text-violet-700 border border-violet-200 hover:border-violet-300 rounded-lg font-medium transition-colors"
                >
                  Adjust Constraint
                </button>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            {results.length > 1 && (
              <ResultsSummary results={results} onSelectTopic={setSelectedTopicIdx} />
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedResult.topicName}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span>{selectedResult.nPrompts} prompts</span>
                    <span>{selectedResult.nUrls} URLs</span>
                    <span>Budget: {selectedResult.selectedBudget}</span>
                    <span className="group relative">
                      Coverage: {(selectedResult.selectedCoverage * 100).toFixed(1)}%
                      <Info className="w-3 h-3 inline ml-0.5 text-gray-400" />
                      <span className="hidden group-hover:block absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                        % of unique URLs cited by at least one prompt
                      </span>
                    </span>
                    <span className="group relative">
                      Resilience: {(selectedResult.selectedResilience * 100).toFixed(1)}%
                      <Info className="w-3 h-3 inline ml-0.5 text-gray-400" />
                      <span className="hidden group-hover:block absolute bottom-full left-0 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-10">
                        % of unique URLs cited by 2+ prompts (backup coverage)
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <label className="text-xs text-gray-500">Strategy:</label>
                  <select
                    value={strategyOverride}
                    onChange={(e) => handleStrategyChangeOnResults(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                  >
                    {DEFAULT_STRATEGIES.map(s => (
                      <option key={s.name} value={s.name}>{strategyLabel(s.name)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedResult.flatness.isFlat && !forceTopicIds.has(selectedResult.topicId) && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Pruning not recommended for this topic</p>
                    <p className="text-sm text-amber-700 mt-1">
                      This topic's coverage curve hasn't flattened — each prompt still adds meaningful new URLs.
                      All prompts are being kept. You can override this if you'd like to prune anyway.
                    </p>
                  </div>
                  <button
                    onClick={() => handleForceOverride(selectedResult.topicId)}
                    className="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex-shrink-0"
                  >
                    Prune Anyway
                  </button>
                </div>
              )}

              {!selectedResult.flatness.isFlat && forceTopicIds.has(selectedResult.topicId) && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 flex-1">Flatness check overridden — pruning results shown despite rising coverage curve.</p>
                  <button
                    onClick={() => {
                      const updated = new Set(forceTopicIds);
                      updated.delete(selectedResult.topicId);
                      setForceTopicIds(updated);
                      const newResults = applySelection(analyses, constraint, strategyOverride, updated);
                      setResults(newResults);
                    }}
                    className="px-3 py-1 text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors flex-shrink-0"
                  >
                    Keep All
                  </button>
                </div>
              )}

              <ManifestTable manifest={selectedResult.manifest} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <FlatnessChart curve={selectedResult.greedyCurve} totalUrls={selectedResult.nUrls} />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <ParetoChart trajectories={selectedResult.trajectories} selectedBudget={selectedResult.selectedBudget} selectedStrategy={selectedResult.selectedStrategy} nPrompts={selectedResult.nPrompts} />
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <TrajectoryChart trajectories={selectedResult.trajectories} selectedBudget={selectedResult.selectedBudget} selectedStrategy={selectedResult.selectedStrategy} metric="coverage" />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <TrajectoryChart trajectories={selectedResult.trajectories} selectedBudget={selectedResult.selectedBudget} selectedStrategy={selectedResult.selectedStrategy} metric="resilience" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
