import { useState, useMemo, useCallback } from 'react';
import { extractWordFrequencies } from '../utils/textAnalysis';
import type { ResponseRow } from '../types';

interface WordCloudProps {
  data: ResponseRow[];
  onWordClick: (word: string) => void;
}

export function WordCloud({ data, onWordClick }: WordCloudProps) {
  const [minFrequency, setMinFrequency] = useState(5);
  const [maxWords, setMaxWords] = useState(100);

  const words = useMemo(
    () => extractWordFrequencies(data, minFrequency, maxWords),
    [data, minFrequency, maxWords]
  );

  const maxValue = useMemo(() => Math.max(...words.map(w => w.value), 1), [words]);

  const getFontSize = useCallback((value: number) => {
    const minSize = 14;
    const maxSize = 64;
    const ratio = value / maxValue;
    return minSize + ratio * (maxSize - minSize);
  }, [maxValue]);

  const getColor = useCallback((value: number) => {
    const ratio = value / maxValue;
    const colors = [
      'text-gray-400',
      'text-teal-400',
      'text-teal-500',
      'text-teal-600',
      'text-teal-700',
      'text-teal-800',
    ];
    const index = Math.min(Math.floor(ratio * colors.length), colors.length - 1);
    return colors[index];
  }, [maxValue]);

  if (data.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No data to analyze. Adjust your filters or upload a CSV.</p>;
  }

  return (
    <div>
      <div className="flex items-center gap-6 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Min frequency:</label>
          <input
            type="range"
            min={2}
            max={Math.max(20, Math.floor(data.length * 0.1))}
            value={minFrequency}
            onChange={(e) => setMinFrequency(Number(e.target.value))}
            className="w-32 accent-teal-600"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{minFrequency}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Max words:</label>
          <input
            type="range"
            min={25}
            max={200}
            step={25}
            value={maxWords}
            onChange={(e) => setMaxWords(Number(e.target.value))}
            className="w-32 accent-teal-600"
          />
          <span className="text-sm font-medium text-gray-700 w-8">{maxWords}</span>
        </div>
      </div>

      {words.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No words meet the minimum frequency threshold. Try lowering it.</p>
      ) : (
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center items-baseline py-8 px-4 min-h-[300px]">
          {words.map(word => (
            <button
              key={word.text}
              onClick={() => onWordClick(word.text)}
              className={`${getColor(word.value)} hover:opacity-75 transition-opacity cursor-pointer font-medium`}
              style={{ fontSize: `${getFontSize(word.value)}px` }}
              title={`${word.text}: appears in ${word.value} responses`}
            >
              {word.text}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center mt-4">
        Click a word to search for it in the Phrase Search tab. Showing {words.length} words.
      </p>
    </div>
  );
}
