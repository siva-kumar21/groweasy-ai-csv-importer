# GrowEasy AI CSV Importer

An AI-powered CSV importer that previews any valid CSV in the browser, then converts messy lead exports into the GrowEasy CRM format through a Node/Express API.

## Features

- Next.js responsive frontend with drag and drop upload
- CSV preview before any backend or AI processing
- Sticky-header tables with horizontal and vertical scrolling
- Express API with CSV upload, parsing, batching, and structured JSON response
- Optional OpenAI extraction with a deterministic local fallback for demos
- Skipped-row reporting for records without email or mobile
- Dark mode, loading progress, and error states
- Unit coverage for local field mapping

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Backend: Node.js, Express, TypeScript
- CSV: Papa Parse
- AI: OpenAI API when `OPENAI_API_KEY` is configured

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Open the app at `http://localhost:3000`.

The API runs at `http://localhost:4000`.

## AI Configuration

The app runs without an API key by using local field-mapping heuristics. To enable LLM extraction, add:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4.1-mini
```

## API

### `POST /api/import`

Accepts multipart form data with a CSV file field named `file`.

Response:

```json
{
  "records": [],
  "skipped": [],
  "totalImported": 0,
  "totalSkipped": 0,
  "warnings": []
}
```

## CRM Fields

The importer returns:

`created_at`, `name`, `email`, `country_code`, `mobile_without_country_code`, `company`, `city`, `state`, `country`, `lead_owner`, `crm_status`, `crm_note`, `data_source`, `possession_time`, `description`.

Allowed `crm_status` values:

- `GOOD_LEAD_FOLLOW_UP`
- `DID_NOT_CONNECT`
- `BAD_LEAD`
- `SALE_DONE`

Allowed `data_source` values:

- `leads_on_demand`
- `meridian_tower`
- `eden_park`
- `varah_swamy`
- `sarjapur_plots`

## Scripts

```bash
npm run dev
npm run build
npm test
```

## Deployment Notes

Deploy the frontend to Vercel and the Express API to Render, Railway, or any Node host. Set `NEXT_PUBLIC_API_URL` on the frontend to the deployed API URL.
