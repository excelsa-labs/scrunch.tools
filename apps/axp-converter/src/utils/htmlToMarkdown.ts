/**
 * HTML → raw markdown conversion using Turndown.
 * Uses the browser's native DOMParser for zero-dependency HTML parsing.
 */

import TurndownService from 'turndown';

// ── HTML detection ───────────────────────────────────────────────────────────

const HTML_INDICATORS = [
  /<!DOCTYPE\s+html/i,
  /^<html[\s>]/i,
];

const HTML_STRUCTURAL_TAGS = [
  /<div[\s>]/i,
  /<p[\s>]/i,
  /<h[1-6][\s>]/i,
  /<ul[\s>]/i,
  /<ol[\s>]/i,
  /<li[\s>]/i,
  /<table[\s>]/i,
  /<section[\s>]/i,
  /<article[\s>]/i,
  /<a\s+href/i,
  /<br\s*\/?>/i,
  /<img\s/i,
];

/** Returns true if the text looks like HTML rather than plain text. */
export function isHtmlContent(text: string): boolean {
  const trimmed = text.trimStart();
  // Quick check: starts with doctype or <html> tag
  if (HTML_INDICATORS.some((re) => re.test(trimmed.slice(0, 200)))) {
    return true;
  }
  // Count distinct structural tags — 3+ means HTML
  let tagCount = 0;
  for (const re of HTML_STRUCTURAL_TAGS) {
    if (re.test(text)) tagCount++;
    if (tagCount >= 3) return true;
  }
  return false;
}

// ── Turndown instance ────────────────────────────────────────────────────────

const turndown = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
});

// Strip noise tags entirely
turndown.remove(['script', 'style', 'noscript']);

// ── Content extraction ───────────────────────────────────────────────────────

/**
 * Extract the main page content from a full HTML document, stripping
 * headers, footers, navigation, and sidebars.
 *
 * Tier 1: If a <main> or <article> tag exists, use only its contents.
 * Tier 2: Otherwise strip known noise elements (semantic tags + ARIA roles).
 * Fragments without a <body> pass through unchanged.
 */
function extractPageContent(html: string): string {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Tier 1: prefer semantic content containers
    const main = doc.querySelector('main') || doc.querySelector('article');
    if (main) return main.innerHTML;

    // Tier 2: strip known noise elements from <body>
    const noiseSelectors = [
      'header', 'footer', 'nav', 'aside',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '[role="complementary"]',
    ];
    doc.querySelectorAll(noiseSelectors.join(', ')).forEach((el) => el.remove());

    return doc.body?.innerHTML ?? html;
  } catch {
    return html; // parsing failed — pass through unchanged
  }
}

/** Convert an HTML string (full page or fragment) to markdown. */
export function convertHtmlToMarkdown(html: string): string {
  const content = extractPageContent(html);
  return turndown.turndown(content).trim();
}
