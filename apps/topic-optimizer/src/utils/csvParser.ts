import Papa from 'papaparse';
import { PromptSource } from '../engine/types';
import { TopicGroup } from '../engine/pipeline';

export interface ParseResult {
  groups: TopicGroup[];
  nTopics: number;
  nPrompts: number;
  nUrls: number;
  errors: string[];
}

// Column aliases: canonical name → accepted CSV header names
const ALIASES: Record<string, string[]> = {
  topic_id: ['topic_id', 'prompt_topic'],
  topic_name: ['topic_name'],
  prompt_id: ['prompt_id'],
  prompt_text: ['prompt_text', 'prompt'],
  url: ['url', 'citations'],
};

function resolveColumn(fields: string[], canonical: string): string | null {
  const aliases = ALIASES[canonical] ?? [canonical];
  for (const alias of aliases) {
    if (fields.includes(alias)) return alias;
  }
  return null;
}

export function parseCSV(rawText: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(rawText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });

  const errors: string[] = [];
  const fields = parsed.meta.fields ?? [];

  // Resolve columns via aliases
  const urlCol = resolveColumn(fields, 'url');
  const promptIdCol = resolveColumn(fields, 'prompt_id');
  const promptTextCol = resolveColumn(fields, 'prompt_text');
  const topicIdCol = resolveColumn(fields, 'topic_id');
  const topicNameCol = resolveColumn(fields, 'topic_name');

  // Only a URL column is truly required
  if (!urlCol) {
    errors.push('Missing required column: url or citations');
    return { groups: [], nTopics: 0, nPrompts: 0, nUrls: 0, errors };
  }

  // Group by topic, then by prompt within each topic
  const topicMap = new Map<string, {
    topicName: string;
    promptMap: Map<string, { promptText: string; sources: Set<string> }>;
  }>();

  const allUrls = new Set<string>();
  const allPromptKeys = new Set<string>();
  let rowIdx = 0;

  for (const row of parsed.data) {
    rowIdx++;

    // Extract URL(s) — split on | for pipe-delimited citations
    const rawUrl = row[urlCol]?.trim();
    if (!rawUrl) continue;
    const urls = rawUrl.includes('|') ? rawUrl.split('|').map(u => u.trim()).filter(Boolean) : [rawUrl];

    // Resolve prompt identity: prompt_id > prompt_text > row index
    const promptId = promptIdCol ? row[promptIdCol]?.trim() : null;
    const promptText = promptTextCol ? row[promptTextCol]?.trim() || '' : '';
    const promptKey = promptId || promptText || `row_${rowIdx}`;

    // Resolve topic: topic_id column > "All Prompts"
    const topicId = topicIdCol ? row[topicIdCol]?.trim() || 'all' : 'all';
    const topicName = topicNameCol ? row[topicNameCol]?.trim() || topicId : topicId === 'all' ? 'All Prompts' : topicId;

    for (const url of urls) {
      allUrls.add(url);
      allPromptKeys.add(`${topicId}::${promptKey}`);

      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, { topicName, promptMap: new Map() });
      }

      const topic = topicMap.get(topicId)!;
      if (!topic.promptMap.has(promptKey)) {
        topic.promptMap.set(promptKey, { promptText, sources: new Set() });
      }

      topic.promptMap.get(promptKey)!.sources.add(url);
    }
  }

  if (allUrls.size === 0) {
    errors.push('No valid rows found — check that your CSV has URL data');
    return { groups: [], nTopics: 0, nPrompts: 0, nUrls: 0, errors };
  }

  const groups: TopicGroup[] = [];
  for (const [topicId, topic] of topicMap) {
    const promptSources: PromptSource[] = [];
    for (const [promptId, prompt] of topic.promptMap) {
      promptSources.push({
        promptId,
        promptText: prompt.promptText,
        sources: Array.from(prompt.sources),
      });
    }
    groups.push({ topicId, topicName: topic.topicName, promptSources });
  }

  return {
    groups,
    nTopics: topicMap.size,
    nPrompts: allPromptKeys.size,
    nUrls: allUrls.size,
    errors,
  };
}
