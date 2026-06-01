/**
 * AI Model Pricing Data — June 2026
 * Prices are in USD per 1,000,000 tokens (1M tokens).
 */

export const PROVIDERS = {
  OpenAI: {
    color: '#10a37f',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    dot: '#10a37f',
    icon: 'psychology',
  },
  Anthropic: {
    color: '#d97757',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30',
    dot: '#d97757',
    icon: 'auto_awesome',
  },
  Google: {
    color: '#4285f4',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30',
    dot: '#4285f4',
    icon: 'scatter_plot',
  },
  xAI: {
    color: '#a855f7',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
    dot: '#a855f7',
    icon: 'bolt',
  },
  DeepSeek: {
    color: '#06b6d4',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-400 dark:border-cyan-500/30',
    dot: '#06b6d4',
    icon: 'travel_explore',
  },
  Mistral: {
    color: '#f59e0b',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    dot: '#f59e0b',
    icon: 'air',
  },
};

/** @type {Array<{id: string, name: string, provider: keyof typeof PROVIDERS, inPrice: number, outPrice: number}>} */
export const MODELS = [
  // ── OpenAI ──────────────────────────────────────────────────
  { id: 'gpt-5-5',        name: 'GPT-5.5',        provider: 'OpenAI',    inPrice: 5.00,  outPrice: 30.00 },
  { id: 'gpt-5-4',        name: 'GPT-5.4',        provider: 'OpenAI',    inPrice: 2.50,  outPrice: 15.00 },
  { id: 'gpt-5-4-mini',   name: 'GPT-5.4 Mini',   provider: 'OpenAI',    inPrice: 0.75,  outPrice: 4.50  },
  { id: 'gpt-5-4-nano',   name: 'GPT-5.4 Nano',   provider: 'OpenAI',    inPrice: 0.20,  outPrice: 1.25  },

  // ── Anthropic ────────────────────────────────────────────────
  { id: 'claude-opus-4-7',   name: 'Claude Opus 4.7',   provider: 'Anthropic', inPrice: 5.00, outPrice: 25.00 },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', provider: 'Anthropic', inPrice: 3.00, outPrice: 15.00 },
  { id: 'claude-haiku-4-5',  name: 'Claude Haiku 4.5',  provider: 'Anthropic', inPrice: 1.00, outPrice: 5.00  },

  // ── Google Gemini ────────────────────────────────────────────
  { id: 'gemini-3-1-pro',        name: 'Gemini 3.1 Pro',        provider: 'Google', inPrice: 2.00, outPrice: 12.00 },
  { id: 'gemini-3-5-flash',      name: 'Gemini 3.5 Flash',      provider: 'Google', inPrice: 1.50, outPrice: 9.00  },
  { id: 'gemini-3-flash',        name: 'Gemini 3 Flash',        provider: 'Google', inPrice: 0.50, outPrice: 3.00  },
  { id: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash-Lite', provider: 'Google', inPrice: 0.25, outPrice: 1.50  },

  // ── xAI Grok ────────────────────────────────────────────────
  { id: 'grok-4-2',      name: 'Grok 4.2',      provider: 'xAI', inPrice: 1.25, outPrice: 5.00 },
  { id: 'grok-4-1-mini', name: 'Grok 4.1 Mini', provider: 'xAI', inPrice: 0.40, outPrice: 2.00 },

  // ── DeepSeek ────────────────────────────────────────────────
  { id: 'deepseek-v3-2', name: 'DeepSeek V3.2', provider: 'DeepSeek', inPrice: 0.80, outPrice: 2.80 },
  { id: 'deepseek-r1',   name: 'DeepSeek R1',   provider: 'DeepSeek', inPrice: 1.20, outPrice: 4.50 },

  // ── Mistral ─────────────────────────────────────────────────
  { id: 'mistral-large-2', name: 'Mistral Large 2', provider: 'Mistral', inPrice: 2.00, outPrice: 6.00 },
  { id: 'mistral-small-3', name: 'Mistral Small 3', provider: 'Mistral', inPrice: 0.40, outPrice: 1.60 },
];
