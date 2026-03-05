export interface TextSegment {
  text: string;
  highlight: boolean;
}

/**
 * Splits text into segments, marking occurrences of the phrase as highlighted.
 * Case-insensitive matching, preserves original casing.
 */
export function segmentByPhrase(text: string, phrase: string): TextSegment[] {
  if (!phrase || !text) return [{ text, highlight: false }];

  const segments: TextSegment[] = [];
  const lowerText = text.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  let lastIndex = 0;

  let searchFrom = 0;
  while (searchFrom < lowerText.length) {
    const idx = lowerText.indexOf(lowerPhrase, searchFrom);
    if (idx === -1) break;

    // Add non-highlighted text before match
    if (idx > lastIndex) {
      segments.push({ text: text.slice(lastIndex, idx), highlight: false });
    }

    // Add highlighted match (preserve original casing)
    segments.push({ text: text.slice(idx, idx + phrase.length), highlight: true });

    lastIndex = idx + phrase.length;
    searchFrom = lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlight: false });
  }

  return segments.length > 0 ? segments : [{ text, highlight: false }];
}

/**
 * Get a context excerpt around the first occurrence of a phrase.
 * Returns ~contextChars characters before and after the first match.
 */
export function getExcerptAroundPhrase(
  text: string,
  phrase: string,
  contextChars = 100
): string {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(phrase.toLowerCase());

  if (idx === -1) return text.slice(0, contextChars * 2) + (text.length > contextChars * 2 ? '...' : '');

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + phrase.length + contextChars);

  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < text.length) excerpt = excerpt + '...';

  return excerpt;
}
