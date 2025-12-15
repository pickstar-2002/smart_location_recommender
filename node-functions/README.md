# EdgeOne Pages node-functions

This directory contains the serverless functions for the EdgeOne Pages deployment.

## API Endpoints

All functions are available under `/api/ai/*`:

- `POST /api/ai/generate-recommendation-reason` - Generate AI recommendation reasons
- `POST /api/ai/generate-route-narration` - Generate route narration
- `POST /api/ai/generate-combined-recommendation` - Generate combined recommendation and route narration
- `POST /api/ai/parse-search-intent` - Parse natural language search intent

## Development

Install dependencies:
```bash
cd node-functions
npm install
```

Build TypeScript:
```bash
npm run build
```

## Deployment

These functions will be automatically deployed when you push to your EdgeOne Pages project.