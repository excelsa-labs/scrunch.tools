import Papa from 'papaparse';
import type { ParseResult, ColumnMapping, ResponseRow } from '../types';

const COLUMN_ALIASES: Record<string, string[]> = {
  prompt: ['prompt', 'prompts', 'question', 'query', 'prompt_text'],
  response_text: ['response_text', 'response', 'responses', 'answer', 'text', 'ai_response', 'response text'],
  platform: ['platform', 'ai_platform', 'model', 'source'],
  stage: ['stage', 'funnel_stage', 'journey_stage'],
  brand_present: ['brand_present', 'present', 'mentioned'],
  brand_position: ['brand_position', 'position'],
  brand_sentiment: ['brand_sentiment', 'sentiment'],
  country: ['country', 'region', 'geo'],
  prompt_id: ['prompt_id', 'id', 'promptid'],
  branded: ['branded'],
  persona_name: ['persona_name', 'persona'],
};

export function parseCSV(rawText: string): ParseResult {
  const result = Papa.parse(rawText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });

  const headers = result.meta.fields || [];
  const rows = result.data as Record<string, string>[];

  const detectedMapping: ColumnMapping = {};
  const lowerHeaders = headers.map(h => h.toLowerCase());

  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = lowerHeaders.findIndex(h => aliases.includes(h));
    if (idx !== -1) {
      detectedMapping[canonical] = headers[idx];
    }
  }

  return { headers, rows, detectedMapping };
}

export function applyColumnMapping(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): ResponseRow[] {
  return rows.map(row => {
    const mapped: Record<string, string> = {};
    for (const [canonical, sourceHeader] of Object.entries(mapping)) {
      if (sourceHeader) {
        mapped[canonical] = row[sourceHeader] || '';
      }
    }
    // Also carry over any unmapped columns with their original headers
    for (const [key, value] of Object.entries(row)) {
      const isAlreadyMapped = Object.values(mapping).includes(key);
      if (!isAlreadyMapped) {
        mapped[key] = value || '';
      }
    }
    return mapped as ResponseRow;
  });
}
