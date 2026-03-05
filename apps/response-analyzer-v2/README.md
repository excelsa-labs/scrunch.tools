# Response Analyzer

A tool for analyzing phrase frequency and messaging patterns across Scrunch API response exports.

## What it does

Upload a CSV export from the Scrunch Responses API and explore:

- **Top Phrases** — ranked n-gram frequency across all response text
- **Word Cloud** — visual representation of word prominence; click any word to jump to Phrase Search
- **Phrase Search** — search for a specific word or phrase and see every response that contains it

Filter results by platform, stage, country, or prompt at any time.

## Input format

Expects a CSV export from the Scrunch Responses API. The tool will auto-detect common column names (`prompt`, `response`, `platform`, `stage`, `country`, etc.). If columns can't be detected automatically, a column mapper dialog appears on upload.

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:5173/analyze/`

## Available commands

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run typecheck  # Type check
npm run lint       # Lint
```
