# Scrunch Tools

A collection of internal tools for working with Scrunch data and the Scrunch API.

## Apps

| App | Path | Description |
|-----|------|-------------|
| **Home** | `apps/home` | Landing page that links to all tools |
| **API Exporter** | `apps/scrunch-api-exporter` | Export data from the Scrunch API to CSV (metrics and raw responses) |
| **Slides Generator** | `apps/google-slides-exporter` | Generate Google Slides reports from Scrunch API data |
| **Bulk Setup** | `apps/bulk-setup` | Configure brands and prompts in bulk |
| **Response Analyzer** | `apps/response-analyzer` | Analyze phrase frequency and messaging patterns in API responses |
| **Topic Optimizer** | `apps/topic-optimizer` | Optimize prompt selections by analyzing coverage and resilience constraints |

## Development

Each app is an independent Vite + React project. Navigate into the relevant app directory and run:

```bash
npm install
npm run dev
```

The **API Exporter** also requires a local proxy server to handle CORS:

```bash
# Terminal 1
npm run server

# Terminal 2
npm run dev
```

See the individual app READMEs for more details.
