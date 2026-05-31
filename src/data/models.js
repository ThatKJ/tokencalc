/**
 * AI Model Pricing Data — May 2026
 * Prices are in USD per 1,000,000 tokens (1M tokens).
 */

export const PROVIDERS = {
  OpenAI: {
    color: '#10a37f',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    dot: '#10a37f',
    icon: 'psychology',
  },
  Anthropic: {
    color: '#d97757',
    badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    dot: '#d97757',
    icon: 'auto_awesome',
  },
  Google: {
    color: '#4285f4',
    badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    dot: '#4285f4',
    icon: 'scatter_plot',
  },
};

/** @type {Array<{id: string, name: string, provider: keyof typeof PROVIDERS, inPrice: number, outPrice: number}>} */
export const MODELS = [
  // ── OpenAI ──────────────────────────────────────────────────
  { id: 'gpt-5-5',        name: 'GPT-5.5',          provider: 'OpenAI',    inPrice: 5.00,  outPrice: 30.00 },
  { id: 'gpt-5-4',        name: 'GPT-5.4',          provider: 'OpenAI',    inPrice: 2.50,  outPrice: 15.00 },
  { id: 'gpt-5-4-mini',   name: 'GPT-5.4 Mini',     provider: 'OpenAI',    inPrice: 0.75,  outPrice: 4.50  },
  { id: 'gpt-5-4-nano',   name: 'GPT-5.4 Nano',     provider: 'OpenAI',    inPrice: 0.20,  outPrice: 1.25  },

  // ── Anthropic ────────────────────────────────────────────────
  { id: 'claude-opus-4-7',    name: 'Claude Opus 4.7',    provider: 'Anthropic', inPrice: 5.00,  outPrice: 25.00 },
  { id: 'claude-sonnet-4-6',  name: 'Claude Sonnet 4.6',  provider: 'Anthropic', inPrice: 3.00,  outPrice: 15.00 },
  { id: 'claude-haiku-4-5',   name: 'Claude Haiku 4.5',   provider: 'Anthropic', inPrice: 1.00,  outPrice: 5.00  },

  // ── Google Gemini ────────────────────────────────────────────
  { id: 'gemini-3-1-pro',         name: 'Gemini 3.1 Pro',         provider: 'Google', inPrice: 2.00,  outPrice: 12.00 },
  { id: 'gemini-3-5-flash',       name: 'Gemini 3.5 Flash',       provider: 'Google', inPrice: 1.50,  outPrice: 9.00  },
  { id: 'gemini-3-flash',         name: 'Gemini 3 Flash',         provider: 'Google', inPrice: 0.50,  outPrice: 3.00  },
  { id: 'gemini-3-1-flash-lite',  name: 'Gemini 3.1 Flash-Lite',  provider: 'Google', inPrice: 0.25,  outPrice: 1.50  },
];
