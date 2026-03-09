import Papa from 'papaparse';
import { PromptSource } from '../engine/types';
import { TopicGroup } from '../engine/pipeline';

interface RawRow {
  topic_id: string;
  topic_name?: string;
  prompt_id: string;
  prompt_text?: string;
  url: string;
}

export interface ParseResult {
  groups: TopicGroup[];
  nTopics: number;
  nPrompts: number;
  nUrls: number;
  errors: string[];
}

export function parseCSV(rawText: string): ParseResult {
  const parsed = Papa.parse<RawRow>(rawText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase(),
  });

  const errors: string[] = [];

  // Validate required columns
  const fields = parsed.meta.fields ?? [];
  const required = ['topic_id', 'prompt_id', 'url'];
  for (const col of required) {
    if (!fields.includes(col)) {
      errors.push(`Missing required column: ${col}`);
    }
  }
  if (errors.length > 0) {
    return { groups: [], nTopics: 0, nPrompts: 0, nUrls: 0, errors };
  }

  // Group by topic_id, then by prompt_id within each topic
  const topicMap = new Map<string, {
    topicName: string;
    promptMap: Map<string, { promptText: string; sources: Set<string> }>;
  }>();

  const allUrls = new Set<string>();
  const allPromptKeys = new Set<string>();

  for (const row of parsed.data) {
    const topicId = row.topic_id?.trim();
    const promptId = row.prompt_id?.trim();
    const url = row.url?.trim();

    if (!topicId || !promptId || !url) continue;

    allUrls.add(url);
    allPromptKeys.add(`${topicId}::${promptId}`);

    if (!topicMap.has(topicId)) {
      topicMap.set(topicId, {
        topicName: row.topic_name?.trim() || topicId,
        promptMap: new Map(),
      });
    }

    const topic = topicMap.get(topicId)!;
    if (!topic.promptMap.has(promptId)) {
      topic.promptMap.set(promptId, {
        promptText: row.prompt_text?.trim() || '',
        sources: new Set(),
      });
    }

    topic.promptMap.get(promptId)!.sources.add(url);
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
