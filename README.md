# Legal Document Analysis Platform

Week 1 scaffold for a legal-document ingestion application built with Next.js, Supabase, LangChain, and Gemini.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Fill in Supabase and Gemini credentials in `.env.local`.

4. Start the app:

```bash
npm run dev
```

## Verification

Run the current Week 1 validation flow:

```bash
bash scripts/run-current-e2e.sh
```

## Current status

- Landing page and dashboard scaffold
- Upload/documents API routes
- PDF parsing, chunking, embeddings, and ingestion pipeline structure
- Supabase and LangChain client helpers

## Teardown

Stop the Next.js dev server with `Ctrl+C`.

