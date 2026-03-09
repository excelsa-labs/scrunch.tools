import { useState, useCallback } from 'react';
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
import { runPipeline, TopicGroup } from './engine/pipeline';
import { ConstraintAxis, TopicResult } from './engine/types';
import { CONSTRAINT_DEFAULTS } from './types';
import { Download, RotateCcw } from 'lucide-react';

function App() {
  const [step, setStep] = useState<'upload' | 'configure' | 'results'>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [groups, setGroups] = useState<TopicGroup[]>([]);
  const [constraintAxis, setConstraintAxis] = useState<ConstraintAxis>('resilience-floor');
  const [constraintValue, setConstraintValue] = useState(CONSTRAINT_DEFAULTS['resilience-floor']);
  const [results, setResults] = useState<TopicResult[]>([]);
  const [selectedTopicIdx, setSelectedTopicIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

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
    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      const output = runPipeline(groups, { axis: constraintAxis, value: constraintValue });
      setResults(output);
      setSelectedTopicIdx(0);
      setStep('results');
      setRunning(false);
    }, 50);
  }, [groups, constraintAxis, constraintValue]);

  const handleExport = useCallback(() => {
    const csv = exportManifestCSV(results);
    downloadCSV(csv, 'topic_optimizer_manifest.csv');
  }, [results]);

  const handleReset = useCallback(() => {
    setStep('upload');
    setParseResult(null);
    setGroups([]);
    setResults([]);
    setParseErrors([]);
  }, []);

  const selectedResult = results[selectedTopicIdx];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
        {/* Upload step */}
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

        {/* Configure step */}
        {step === 'configure' && parseResult && (
          <div className="max-w-md mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Configure Pruning</h2>
            <ConstraintConfig
              axis={constraintAxis}
              value={constraintValue}
              onAxisChange={setConstraintAxis}
              onValueChange={setConstraintValue}
              onRun={handleRun}
              running={running}
              nTopics={parseResult.nTopics}
              nPrompts={parseResult.nPrompts}
              nUrls={parseResult.nUrls}
            />
          </div>
        )}

        {/* Results step */}
        {step === 'results' && selectedResult && (
          <div className="space-y-6">
            {/* Header row */}
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

            {/* Summary cards */}
            {results.length > 1 && (
              <ResultsSummary results={results} onSelectTopic={setSelectedTopicIdx} />
            )}

            {/* Selected topic detail */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{selectedResult.topicName}</h3>
              <div className="flex gap-4 text-sm text-gray-600 mb-4">
                <span>{selectedResult.nPrompts} prompts</span>
                <span>{selectedResult.nUrls} URLs</span>
                <span>Budget: {selectedResult.selectedBudget}</span>
                <span>Strategy: {selectedResult.selectedStrategy}</span>
                <span>Coverage: {(selectedResult.selectedCoverage * 100).toFixed(1)}%</span>
                <span>Resilience: {(selectedResult.selectedResilience * 100).toFixed(1)}%</span>
              </div>

              <ManifestTable manifest={selectedResult.manifest} />
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <FlatnessChart curve={selectedResult.greedyCurve} totalUrls={selectedResult.nUrls} />
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-5">
                <ParetoChart paretoEnvelope={selectedResult.paretoEnvelope} selectedPoint={selectedResult.selectedPoint} />
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <TrajectoryChart trajectories={selectedResult.trajectories} selectedBudget={selectedResult.selectedBudget} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
