import { TopicResult } from '../engine/types';

interface TopicSelectorProps {
  results: TopicResult[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
}

export function TopicSelector({ results, selectedIdx, onSelect }: TopicSelectorProps) {
  if (results.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Topic:</label>
      <select
        value={selectedIdx}
        onChange={(e) => onSelect(parseInt(e.target.value))}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
      >
        {results.map((r, i) => (
          <option key={r.topicId} value={i}>
            {r.topicName} ({r.manifest.filter(m => m.status === 'KEPT').length}/{r.nPrompts} kept)
          </option>
        ))}
      </select>
    </div>
  );
}
