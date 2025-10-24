# AI Trim Size Calculator v2.0

A React + TypeScript web application for optimizing paper trim set combinations. The app follows the v2.0 product requirements: it supports dynamic trim-set configuration, real-time calculations, AI-assisted suggestions, and persistent Supabase-backed history management.

## Features

- 📋 **Dynamic calculator table** for managing trim widths (rows) and set combinations (columns).
- 🧮 **Real-time roll and tonnage summaries** with deckle compliance indicators per set.
- 🤖 **AI suggestion hook** prepared for GPT-5 Codex responses (connect via `VITE_AI_ENDPOINT`).
- 💾 **Supabase persistence** for saving, loading, and deleting calculation snapshots.
- 🎨 **Modern UI** using Tailwind CSS and responsive dark theme layout.

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file and configure the required environment variables:

   ```bash
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_AI_ENDPOINT=https://your-backend.example.com/api/ai-trim
   ```

   - The Supabase project must contain a `calculations` table with the following fields:
     - `id` (uuid, primary key, default `uuid_generate_v4()`)
     - `name` (text)
     - `state` (jsonb)
     - `created_at` (timestamptz, default `now()`)

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Build for production:

   ```bash
   npm run build
   ```

## AI Integration

`src/services/aiService.ts` expects a backend endpoint that proxies GPT-5 Codex requests. It sends a JSON body containing the serialized calculator state and expects a structured JSON response following the schema defined in `AiSuggestionResponse`.

## Supabase Integration

The helper functions in `src/services/historyService.ts` interact with the `calculations` table. They require a configured Supabase client (`src/lib/supabaseClient.ts`). When the environment variables are absent, the UI gracefully disables history actions by surfacing an inline warning.

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) for tooling
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Supabase JS SDK](https://supabase.com/docs/reference/javascript/installing) for persistence

## License

This project is provided as-is for product development iterations.
