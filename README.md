# TokenCalc AI — Prompt Token & Cost Calculator

A production-ready, single-page AI Prompt Token & Cost Calculator built with **Astro 5**, **Tailwind CSS v4**, and **tiktoken-lite**.

## Features

- 🔢 **Accurate token counting** via `tiktoken-lite` (gpt-4 encoding) loaded from `esm.sh`
- 💰 **11 AI models** across OpenAI, Anthropic, and Google Gemini (May 2026 pricing)
- 📊 **Live model card grid** — sorted cheapest-first, cheapest highlighted
- 📈 **Monthly volume bar chart** — pure CSS horizontal bars
- ⚡ **Real-time updates** — debounced 150ms, zero backend
- 📋 **Copy Stats** — one-click clipboard summary
- 📱 **Fully responsive** — 1 → 2 → 3 column grid

## Models & Pricing (May 2026)

| Model                 | Input $/1M | Output $/1M |
|-----------------------|-----------|------------|
| GPT-5.5               | $5.00     | $30.00     |
| GPT-5.4               | $2.50     | $15.00     |
| GPT-5.4 Mini          | $0.75     | $4.50      |
| GPT-5.4 Nano          | $0.20     | $1.25      |
| Claude Opus 4.7       | $5.00     | $25.00     |
| Claude Sonnet 4.6     | $3.00     | $15.00     |
| Claude Haiku 4.5      | $1.00     | $5.00      |
| Gemini 3.1 Pro        | $2.00     | $12.00     |
| Gemini 3.5 Flash      | $1.50     | $9.00      |
| Gemini 3 Flash        | $0.50     | $3.00      |
| Gemini 3.1 Flash-Lite | $0.25     | $1.50      |

## Tech Stack

- **Astro 5** (static output)
- **Tailwind CSS v4** (Vite plugin)
- **tiktoken-lite** via `esm.sh` CDN
- **Material Symbols** icon font
- **Hanken Grotesk** + **Geist** + **JetBrains Mono** typography

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── PromptInput.astro      # Textarea + token/char counters
│   ├── ModelCard.astro        # Grid container (JS-rendered)
│   ├── Controls.astro         # Multiplier slider + calls input
│   └── VolumeEstimator.astro  # Monthly bar chart container
├── layouts/
│   └── MainLayout.astro       # Root HTML shell + SEO meta
├── pages/
│   └── index.astro            # Single-page entry point
├── scripts/
│   └── calculator.js          # All business logic
├── data/
│   └── models.js              # Model pricing data
└── styles/
    └── global.css             # Tailwind + custom styles
```

> Pricing last updated **May 2026**. For estimation purposes only.
