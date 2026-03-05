import { STOP_WORDS } from './stopWords';
import type { ResponseRow, NgramResult, WordFrequency } from '../types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\[?\[\d+\]\]?\([^)]*\)/g, '') // Remove markdown citation links [[n]](url)
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
}

export function extractNgrams(
  data: ResponseRow[],
  n: number,
  topN: number = 50
): NgramResult[] {
  const ngramMap = new Map<string, { count: number; responseIndices: Set<number> }>();

  for (let i = 0; i < data.length; i++) {
    const words = tokenize(data[i].response_text || '');
    const seenInResponse = new Set<string>();

    for (let j = 0; j <= words.length - n; j++) {
      const ngram = words.slice(j, j + n).join(' ');

      if (!ngramMap.has(ngram)) {
        ngramMap.set(ngram, { count: 0, responseIndices: new Set() });
      }

      const entry = ngramMap.get(ngram)!;
      entry.count++;

      if (!seenInResponse.has(ngram)) {
        seenInResponse.add(ngram);
        entry.responseIndices.add(i);
      }
    }
  }

  const totalResponses = data.length;
  const results: NgramResult[] = [];

  for (const [phrase, entry] of ngramMap) {
    results.push({
      phrase,
      count: entry.count,
      responseCount: entry.responseIndices.size,
      responsePercent: totalResponses > 0 ? (entry.responseIndices.size / totalResponses) * 100 : 0,
    });
  }

  results.sort((a, b) => b.responseCount - a.responseCount);
  return results.slice(0, topN);
}

export function extractWordFrequencies(
  data: ResponseRow[],
  minFrequency: number = 3,
  maxWords: number = 150
): WordFrequency[] {
  const wordMap = new Map<string, number>();

  for (const row of data) {
    const words = tokenize(row.response_text || '');
    const seen = new Set<string>();
    for (const word of words) {
      if (!seen.has(word)) {
        seen.add(word);
        wordMap.set(word, (wordMap.get(word) || 0) + 1);
      }
    }
  }

  const results: WordFrequency[] = [];
  for (const [text, value] of wordMap) {
    if (value >= minFrequency) {
      results.push({ text, value });
    }
  }

  results.sort((a, b) => b.value - a.value);
  return results.slice(0, maxWords);
}
