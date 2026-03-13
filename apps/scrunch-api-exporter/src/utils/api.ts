export interface Brand {
  id: number;
  name: string;
  website: string;
}

export const DEFAULT_LIMIT = 1000;
export const MAX_ROWS = 200000;

const QUERY_METRICS = [
  'responses',
  'brand_presence_percentage',
  'brand_position_score',
  'brand_sentiment_score',
  'competitor_presence_percentage',
  'competitor_position_score',
  'competitor_sentiment_score',
];

const COMPETITOR_METRICS = [
  'competitor_presence_percentage',
  'competitor_position_score',
  'competitor_sentiment_score',
];

const COMPETITOR_DIMENSIONS = [
  'competitor_id',
  'competitor_name',
];

interface ExportParams {
  apiKey: string;
  brandId: string;
  startDate: string;
  endDate: string;
  fetchAll?: boolean;
  endpoint?: 'responses' | 'query';
  fields?: string[];
  filterPlatforms?: string[];
  filterStages?: string[];
  onProgress?: (loaded: number, total: number) => void;
}

type AnyApiResponse =
  | Record<string, unknown>[]
  | { items: Record<string, unknown>[]; total?: number }
  | { data: Record<string, unknown>[]; total?: number }
  | { results: Record<string, unknown>[]; total?: number };

function extractRows(json: AnyApiResponse): Record<string, unknown>[] {
  if (Array.isArray(json)) {
    return json;
  }

  if ('items' in json && Array.isArray(json.items)) {
    return json.items;
  }

  if ('data' in json && Array.isArray(json.data)) {
    return json.data;
  }

  if ('results' in json && Array.isArray(json.results)) {
    return json.results;
  }

  return [];
}

export function validateQueryFields(fields: string[]): { valid: boolean; error?: string } {
  if (fields.length === 0) {
    return { valid: false, error: 'Query exports must include at least one metric.' };
  }

  const hasMetric = fields.some(f => QUERY_METRICS.includes(f));
  if (!hasMetric) {
    return { valid: false, error: 'Query exports must include at least one metric.' };
  }

  const selectedCompetitorMetrics = fields.filter(f => COMPETITOR_METRICS.includes(f));
  if (selectedCompetitorMetrics.length > 0) {
    const hasCompetitorDimension = fields.some(f => COMPETITOR_DIMENSIONS.includes(f));
    if (!hasCompetitorDimension) {
      return { valid: false, error: 'Competitor metrics require competitor_id or competitor_name.' };
    }
  }

  return { valid: true };
}

async function fetchPageWithRetry(
  proxyUrl: string,
  body: Record<string, unknown>,
  maxRetries = 2,
): Promise<{ items: Record<string, unknown>[]; total?: number }> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const msg = errorData.error || `Export failed with status ${response.status}`;
        // Don't retry 4xx errors (client errors like auth failures)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(msg);
        }
        lastError = new Error(msg);
        continue;
      }

      const json = await response.json();
      const items = extractRows(json as AnyApiResponse);
      const total = (json && typeof json === 'object' && typeof json.total === 'number')
        ? json.total as number
        : undefined;

      return { items, total };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error('Request timeout - try reducing date range or fields');
        // Retry timeouts
        continue;
      }
      if (error instanceof Error) {
        lastError = error;
        // Don't retry client errors that were already thrown
        if (error.message.startsWith('Export failed with status 4')) {
          throw error;
        }
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error('Request failed after retries');
}

export interface FetchResult {
  data: Record<string, unknown>[];
  capped?: boolean;
}

export async function fetchAndFlattenData(params: ExportParams): Promise<FetchResult> {
  const { apiKey, brandId, startDate, endDate, fetchAll = false, endpoint = 'responses', fields = [], filterPlatforms = [], filterStages = [], onProgress } = params;

  const proxyUrl = 'https://qnbxemqvfzzgkxchtbhb.supabase.co/functions/v1/scrunch-proxy';

  const allItems: Record<string, unknown>[] = [];
  let offset = 0;
  const pageSize = 1000;
  let knownTotal: number | undefined;

  try {
    onProgress?.(0, 0);

    while (true) {
      const { items, total } = await fetchPageWithRetry(proxyUrl, {
        apiKey,
        brandId,
        startDate,
        endDate,
        endpoint,
        fields,
        fetchAll,
        filterPlatforms,
        filterStages,
        limit: pageSize,
        offset,
      });

      // Only trust total as a dataset total if it's larger than items returned.
      // When total === items.length, the API is likely returning a page count, not the dataset total.
      if (total !== undefined && knownTotal === undefined && total > items.length) {
        knownTotal = total;
      }

      if (items.length === 0) {
        break;
      }

      allItems.push(...items);

      const progressTotal = knownTotal ?? MAX_ROWS;
      onProgress?.(allItems.length, progressTotal);

      if (allItems.length >= MAX_ROWS) {
        onProgress?.(allItems.length, allItems.length);
        return { data: allItems, capped: true };
      }

      // Stop after first page unless fetchAll is set
      if (!fetchAll) {
        break;
      }

      // Stop if we've reached the last page (short page = no more data)
      if (items.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    // Final progress update
    onProgress?.(allItems.length, allItems.length);
    return { data: allItems };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

const FIELD_ORDER = [
  'id',
  'created_at',
  'platform',
  'country',
  'prompt_id',
  'prompt',
  'response_text',
  'stage',
  'branded',
  'persona_id',
  'persona_name',
  'tags',
  'key_topics',
  'brand_present',
  'brand_sentiment',
  'brand_position',
  'competitors_present',
  'citations',
];

function escapeCSVValue(value: unknown): string {
  const str = String(value || '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(data: Record<string, unknown>[], selectedColumns?: string[]): string {
  if (data.length === 0) {
    return '';
  }

  let columns: string[];

  if (selectedColumns && selectedColumns.length > 0) {
    columns = selectedColumns;
  } else {
    const inferredColumns = Object.keys(data[0] || {});
    columns = inferredColumns.length > 0 ? inferredColumns : FIELD_ORDER;
  }

  const csvRows: string[] = [];
  csvRows.push(columns.map(escapeCSVValue).join(','));

  for (const item of data) {
    const row = columns.map(field => escapeCSVValue(item[field]));
    csvRows.push(row.join(','));
  }

  return csvRows.join('\n');
}

export async function fetchBrands(apiKey: string): Promise<Brand[]> {
  const proxyUrl = 'https://qnbxemqvfzzgkxchtbhb.supabase.co/functions/v1/scrunch-proxy';
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
      'apikey': supabaseKey,
    },
    body: JSON.stringify({
      apiKey,
      endpoint: 'brands',
      limit: 100,
      offset: 0,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch brands: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.items && Array.isArray(json.items)) {
    return json.items as Brand[];
  }

  if (Array.isArray(json)) {
    return json as Brand[];
  }

  return [];
}

export const AVAILABLE_COLUMNS = FIELD_ORDER;
