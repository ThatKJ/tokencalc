# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands
- Develop: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Deploy (Cloudflare Workers): `npm run deploy`
- Preview on Workers runtime: `npm run preview:cf`

## Architecture & Structure
TokenCalc AI is a client-side prompt token and cost calculator built with Astro and Tailwind CSS v4. It operates without a backend, performing all calculations and DOM updates in the browser.

### Core Logic & Data
- **Business Logic**: `src/scripts/calculator.js` contains the core calculation engine, token counting logic, and DOM injection routines.
- **Pricing Data**: `src/data/models.js` acts as the single source of truth for AI model pricing and specifications.
- **Tokenization**: Uses `tiktoken-lite` (via esm.sh) for `cl100k_base` encoding, with a 1.3 tokens/word heuristic fallback for robustness.

### Component Hierarchy
- **Pages**: `src/pages/index.astro` is the single entry point.
- **Layout**: `src/layouts/MainLayout.astro` provides the HTML shell and SEO metadata.
- **Components**:
    - `PromptInput.astro`: Handles user text input and real-time character/token counters.
    - `Controls.astro`: Manages volume multipliers and daily call inputs.
    - `ModelCard.astro`: Container for the dynamically rendered grid of model cost cards.
    - `VolumeEstimator.astro`: Container for the monthly volume bar chart.

### Styling
- Uses **Tailwind CSS v4**.
- Global design tokens and custom properties (colors, fonts) are defined in `src/styles/global.css`.
