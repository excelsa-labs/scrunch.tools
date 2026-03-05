import type { ResponseRow, PhraseSearchResult, PerPromptResult } from '../types';

export function searchPhrases(
  data: ResponseRow[],
  phrases: string[]
): PhraseSearchResult[] {
  // Group responses by prompt
  const byPrompt = new Map<string, ResponseRow[]>();
  for (const row of data) {
    const key = row.prompt_id || row.prompt;
    if (!byPrompt.has(key)) byPrompt.set(key, []);
    byPrompt.get(key)!.push(row);
  }

  return phrases.map(phrase => {
    const lowerPhrase = phrase.toLowerCase().trim();
    if (!lowerPhrase) {
      return {
        phrase,
        overallCount: 0,
        overallTotal: data.length,
        overallPercent: 0,
        perPrompt: [],
      };
    }

    // Overall count
    let overallCount = 0;
    for (const row of data) {
      if ((row.response_text || '').toLowerCase().includes(lowerPhrase)) {
        overallCount++;
      }
    }

    // Per-prompt breakdown
    const perPrompt: PerPromptResult[] = [];
    for (const [promptKey, rows] of byPrompt) {
      let containsCount = 0;
      for (const row of rows) {
        if ((row.response_text || '').toLowerCase().includes(lowerPhrase)) {
          containsCount++;
        }
      }

      const platforms = [...new Set(rows.map(r => r.platform).filter(Boolean))];

      perPrompt.push({
        promptKey,
        promptText: rows[0].prompt || promptKey,
        containsCount,
        totalResponses: rows.length,
        percent: rows.length > 0 ? (containsCount / rows.length) * 100 : 0,
        platforms,
      });
    }

    perPrompt.sort((a, b) => b.percent - a.percent);

    return {
      phrase,
      overallCount,
      overallTotal: data.length,
      overallPercent: data.length > 0 ? (overallCount / data.length) * 100 : 0,
      perPrompt,
    };
  });
}

export interface DimensionBreakdown {
  groupValue: string;
  containsCount: number;
  totalResponses: number;
  percent: number;
}

export function aggregateByDimension(
  data: ResponseRow[],
  phrase: string,
  dimension: string
): DimensionBreakdown[] {
  const groups = new Map<string, { contains: number; total: number }>();
  const lowerPhrase = phrase.toLowerCase().trim();

  for (const row of data) {
    const groupValue = row[dimension] || 'Unknown';
    if (!groups.has(groupValue)) groups.set(groupValue, { contains: 0, total: 0 });
    const g = groups.get(groupValue)!;
    g.total++;
    if ((row.response_text || '').toLowerCase().includes(lowerPhrase)) {
      g.contains++;
    }
  }

  return Array.from(groups.entries())
    .map(([groupValue, d]) => ({
      groupValue,
      containsCount: d.contains,
      totalResponses: d.total,
      percent: d.total > 0 ? (d.contains / d.total) * 100 : 0,
    }))
    .sort((a, b) => b.percent - a.percent);
}

export function generateSearchCSV(results: PhraseSearchResult[]): string {
  const lines: string[] = ['Phrase,Overall Match %,Overall Count,Total Responses,Prompts Matched'];

  for (const r of results) {
    const promptsMatched = r.perPrompt.filter(p => p.containsCount > 0).length;
    lines.push(
      `"${r.phrase.replace(/"/g, '""')}",${r.overallPercent.toFixed(1)}%,${r.overallCount},${r.overallTotal},${promptsMatched}/${r.perPrompt.length}`
    );
  }

  return lines.join('\n');
}
