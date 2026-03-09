import { TopicResult } from '../engine/types';

export function exportManifestCSV(results: TopicResult[]): string {
  const headers = ['topic_id', 'topic_name', 'prompt_id', 'prompt_text', 'status', 'n_urls', 'covered_by', 'uncovered_urls'];
  const rows = [headers.join(',')];

  for (const result of results) {
    for (const row of result.manifest) {
      const coveredBy = row.coveringPrompts
        .map(cp => `${cp.promptId}(${cp.sharedUrls})`)
        .join('; ');
      rows.push([
        csvEscape(row.topicId),
        csvEscape(row.topicName),
        csvEscape(row.promptId),
        csvEscape(row.promptText),
        row.status,
        String(row.nUrls),
        csvEscape(coveredBy),
        String(row.uncoveredUrls),
      ].join(','));
    }
  }

  return rows.join('\n');
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
