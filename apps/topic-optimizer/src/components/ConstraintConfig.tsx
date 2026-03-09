import { ConstraintAxis } from '../engine/types';
import { CONSTRAINT_DEFAULTS } from '../types';
import { Play } from 'lucide-react';

interface ConstraintConfigProps {
  axis: ConstraintAxis;
  value: number;
  onAxisChange: (axis: ConstraintAxis) => void;
  onValueChange: (value: number) => void;
  onRun: () => void;
  running: boolean;
  nTopics: number;
  nPrompts: number;
  nUrls: number;
}

const AXES: { key: ConstraintAxis; label: string; description: string; unit: string }[] = [
  { key: 'coverage-floor', label: 'Coverage Floor', description: 'Keep at least X% of baseline URL coverage', unit: '%' },
  { key: 'resilience-floor', label: 'Resilience Floor', description: 'Keep at least X% of baseline URL resilience (2+ prompts)', unit: '%' },
  { key: 'budget', label: 'Budget', description: 'Target exactly N prompts to keep', unit: 'prompts' },
];

export function ConstraintConfig({
  axis, value, onAxisChange, onValueChange, onRun, running,
  nTopics, nPrompts, nUrls,
}: ConstraintConfigProps) {
  const currentAxis = AXES.find(a => a.key === axis)!;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-violet-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-700">{nTopics}</div>
          <div className="text-xs text-violet-600">Topics</div>
        </div>
        <div className="bg-violet-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-700">{nPrompts}</div>
          <div className="text-xs text-violet-600">Prompts</div>
        </div>
        <div className="bg-violet-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-violet-700">{nUrls}</div>
          <div className="text-xs text-violet-600">Unique URLs</div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Constraint Type</label>
        <div className="space-y-2">
          {AXES.map(a => (
            <label key={a.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              axis === a.key ? 'border-violet-400 bg-violet-50' : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="constraint-axis"
                checked={axis === a.key}
                onChange={() => { onAxisChange(a.key); onValueChange(CONSTRAINT_DEFAULTS[a.key]); }}
                className="mt-0.5 text-violet-600 focus:ring-violet-500"
              />
              <div>
                <div className="font-medium text-sm text-gray-900">{a.label}</div>
                <div className="text-xs text-gray-500">{a.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {currentAxis.label} Value
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={axis === 'budget' ? value : Math.round(value * 100)}
            onChange={(e) => {
              const raw = parseFloat(e.target.value);
              if (isNaN(raw)) return;
              onValueChange(axis === 'budget' ? raw : raw / 100);
            }}
            step={axis === 'budget' ? 1 : 1}
            min={axis === 'budget' ? 1 : 1}
            max={axis === 'budget' ? 10000 : 100}
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          />
          <span className="text-sm text-gray-500">{currentAxis.unit}</span>
        </div>
      </div>

      <button
        onClick={onRun}
        disabled={running}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 rounded-lg font-medium transition-colors"
      >
        {running ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            Run Analysis
          </>
        )}
      </button>
    </div>
  );
}
