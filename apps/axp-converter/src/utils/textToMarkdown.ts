/**
 * Heuristic plain-text → raw markdown conversion.
 * Preserves all original wording. Only adds markdown structural syntax.
 */

// Lowercase words acceptable as non-initial words in title-case headings.
const TITLE_LOWERCASE = new Set([
  'a', 'an', 'the', 'to', 'in', 'on', 'at', 'by', 'for', 'of', 'or',
  'and', 'but', 'nor', 'from', 'with', 'into', 'as', 'up', 'via',
]);

// Words that indicate the first line is body prose, not a document title.
const BODY_TEXT_STARTERS = new Set([
  'you', 'we', 'they', 'i', 'he', 'she', 'it',
  'this', 'these', 'those', 'there', 'here',
  'please', 'note', 'remember', 'make', 'ensure', 'check',
]);

function isTitleCase(line: string): boolean {
  const words = line.trim().split(/\s+/);
  if (words.length === 0 || words.length > 12) return false;
  return words.every((w, i) => {
    const clean = w.replace(/[^a-zA-Z]/g, '');
    if (i === 0) return /^[A-Z]/.test(w);
    // Use raw word length (not clean) so "app." doesn't pass via length ≤ 3
    return /^[A-Z]/.test(w) || TITLE_LOWERCASE.has(clean.toLowerCase()) || w.length <= 3;
  });
}

function isAllCaps(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
}

function isHeadingCandidate(line: string, nextLine: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 100) return false;
  if (trimmed.startsWith('#')) return false;
  if (isAllCaps(trimmed)) return true;
  if (isTitleCase(trimmed) && trimmed.length <= 60) return true;
  if (trimmed.endsWith(':') && (!nextLine || nextLine.trim() === '')) return true;
  return false;
}

function isBulletLine(line: string): boolean {
  return /^(\s*)([-•*–])\s+/.test(line);
}

function isNumberedLine(line: string): boolean {
  return /^(\s*)(\d+[.)]\s+|\([a-z\d]\)\s+|[a-z][.)]\s+)/.test(line);
}

function normalizeBullet(line: string): string {
  return line.replace(/^(\s*)([-•*–])\s+/, '$1- ');
}

function normalizeNumbered(line: string): string {
  // Use $1$2. to preserve the original digit (was $11. which always output "1.")
  return line.replace(/^(\s*)(\d+)[.)]\s+/, '$1$2. ')
    .replace(/^(\s*)\([a-z\d]\)\s+/, '$11. ')
    .replace(/^(\s*)[a-z][.)]\s+/, '$11. ');
}

function isBlank(line: string): boolean {
  return line.trim() === '';
}

// Returns false for lines that look like body prose rather than document titles.
function isFirstLineH1Eligible(trimmed: string): boolean {
  if (isBulletLine(trimmed) || isNumberedLine(trimmed)) return false;
  if (/[.!?]$/.test(trimmed)) return false;      // sentence-terminal punctuation
  if (/^https?:\/\//.test(trimmed)) return false; // URL
  if (trimmed.length > 100) return false;
  const firstWord = trimmed.split(/\s+/)[0].toLowerCase().replace(/[^a-z]/g, '');
  if (BODY_TEXT_STARTERS.has(firstWord)) return false;
  return true;
}

// ── Table conversion ──────────────────────────────────────────────────────────

function isTsvLine(line: string): boolean {
  if (!line.includes('\t')) return false;
  const cols = line.split('\t');
  return cols.length >= 2 && cols.some(c => c.trim().length > 0);
}

function convertTsvBlock(lines: string[]): string {
  const rows = lines.map(line =>
    line.split('\t').map(cell => cell.trim().replace(/\|/g, '\\|'))
  );
  const headers = rows[0];
  const body = rows.slice(1);
  const headerLine = '| ' + headers.join(' | ') + ' |';
  const sepLine    = '| ' + headers.map(() => '---').join(' | ') + ' |';
  const dataLines  = body.map(row => '| ' + row.join(' | ') + ' |');
  return [headerLine, sepLine, ...dataLines].join('\n');
}

function replaceTsvBlocks(text: string): string {
  const lines = text.split('\n');
  const output: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTsvLine(lines[i])) {
      // Collect the full run of consecutive TSV lines
      const run: string[] = [];
      while (i < lines.length && isTsvLine(lines[i])) {
        run.push(lines[i]);
        i++;
      }
      // Validate: need ≥2 rows and consistent column count (≥80%)
      if (run.length >= 2) {
        const colCounts = run.map(l => l.split('\t').length);
        const mode = Math.max(...colCounts);
        const consistent = colCounts.filter(c => c === mode || c === mode - 1).length;
        if (mode >= 2 && consistent / run.length >= 0.8) {
          output.push(convertTsvBlock(run));
          continue;
        }
      }
      // Not a valid table — pass lines through unchanged
      output.push(...run);
    } else {
      output.push(lines[i]);
      i++;
    }
  }
  return output.join('\n');
}

// ── Main export ───────────────────────────────────────────────────────────────

export function convertToMarkdown(rawText: string): string {
  // Pre-process: convert tab-separated blocks to markdown tables before line loop
  const preprocessed = replaceTsvBlocks(rawText);
  const lines = preprocessed.split('\n');
  const output: string[] = [];
  let firstHeadingDone = false;
  let firstContentLineSeen = false; // tracks whether the first non-blank line is processed

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const nextLine = lines[i + 1] ?? '';

    // Preserve blank lines
    if (isBlank(line)) { output.push(''); continue; }

    // Already a markdown heading — preserve as-is
    if (trimmed.startsWith('#')) {
      output.push(line);
      if (!firstHeadingDone) firstHeadingDone = true;
      firstContentLineSeen = true;
      continue;
    }

    // Already a markdown list item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      firstContentLineSeen = true;
      output.push(line);
      continue;
    }

    // Pass markdown table rows through unchanged (already converted by replaceTsvBlocks)
    if (trimmed.startsWith('|')) {
      firstContentLineSeen = true;
      output.push(line);
      continue;
    }

    // First non-blank, non-list, non-table line → H1 if it looks like a document title
    if (!firstHeadingDone && !firstContentLineSeen && isFirstLineH1Eligible(trimmed)) {
      output.push(`# ${trimmed}`);
      firstHeadingDone = true;
      firstContentLineSeen = true;
      continue;
    }
    firstContentLineSeen = true;

    // Heading detection (all-caps, title-case, colon-terminated section label)
    if (isHeadingCandidate(trimmed, nextLine)) {
      const cleanedHeading = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
      output.push(firstHeadingDone ? `## ${cleanedHeading}` : `# ${cleanedHeading}`);
      if (!firstHeadingDone) firstHeadingDone = true;
      continue;
    }

    // Bullet list normalization
    if (isBulletLine(line)) { output.push(normalizeBullet(line)); continue; }

    // Numbered list normalization
    if (isNumberedLine(line)) { output.push(normalizeNumbered(line)); continue; }

    // Code block: line indented 4+ spaces (only if not inside a list)
    if (line.startsWith('    ') && !isBulletLine(line) && !isNumberedLine(line)) {
      output.push(line);
      continue;
    }

    // Default: preserve line as-is (paragraph text)
    output.push(line);
  }

  // Clean up: collapse 2+ consecutive blank lines to 1
  const cleaned: string[] = [];
  let blankCount = 0;
  for (const line of output) {
    if (isBlank(line)) {
      blankCount++;
      if (blankCount <= 1) cleaned.push(line);
    } else {
      blankCount = 0;
      cleaned.push(line);
    }
  }

  return cleaned.join('\n').trim();
}
