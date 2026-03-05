export interface ResponseRow {
  platform: string;
  country: string;
  prompt_id: string;
  prompt: string;
  response_text: string;
  stage: string;
  branded: string;
  persona_name: string;
  brand_present: string;
  brand_position: string;
  brand_sentiment: string;
  [key: string]: string;
}

export interface ColumnMapping {
  [canonical: string]: string | undefined;
}

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  detectedMapping: ColumnMapping;
}

export interface FilterState {
  platforms: string[];
  stages: string[];
  countries: string[];
  promptIds: string[];
}

export interface NgramResult {
  phrase: string;
  count: number;
  responseCount: number;
  responsePercent: number;
}

export interface WordFrequency {
  text: string;
  value: number;
}

export interface PhraseSearchResult {
  phrase: string;
  overallCount: number;
  overallTotal: number;
  overallPercent: number;
  perPrompt: PerPromptResult[];
}

export interface PerPromptResult {
  promptKey: string;
  promptText: string;
  containsCount: number;
  totalResponses: number;
  percent: number;
  platforms?: string[];
}
