/**
 * calculator.js — Core business logic (light theme)
 *
 * Responsibilities:
 *  - Token counting via tiktoken-lite (esm.sh CDN)
 *  - Debounced prompt analysis (150 ms)
 *  - Cost calculation for all models
 *  - DOM rendering — model cards grid + bar chart
 *  - Copy-stats functionality
 */

// ─── Provider & Model Data ────────────────────────────────────────────────────
const PROVIDERS = {
  OpenAI: {
    color:      '#00687a',
    badgeBg:    'rgba(0,104,122,0.08)',
    badgeColor: '#00687a',
    badgeBorder:'rgba(0,104,122,0.2)',
    icon:       'psychology',
  },
  Anthropic: {
    color:      '#8c5000',
    badgeBg:    'rgba(140,80,0,0.08)',
    badgeColor: '#8c5000',
    badgeBorder:'rgba(140,80,0,0.22)',
    icon:       'auto_awesome',
  },
  Google: {
    color:      '#1a6fd4',
    badgeBg:    'rgba(26,111,212,0.08)',
    badgeColor: '#1a6fd4',
    badgeBorder:'rgba(26,111,212,0.22)',
    icon:       'scatter_plot',
  },
};

const MODELS = [
  { id: 'gpt-5-5',               name: 'GPT-5.5',              provider: 'OpenAI',    inPrice: 5.00,  outPrice: 30.00 },
  { id: 'gpt-5-4',               name: 'GPT-5.4',              provider: 'OpenAI',    inPrice: 2.50,  outPrice: 15.00 },
  { id: 'gpt-5-4-mini',          name: 'GPT-5.4 Mini',         provider: 'OpenAI',    inPrice: 0.75,  outPrice: 4.50  },
  { id: 'gpt-5-4-nano',          name: 'GPT-5.4 Nano',         provider: 'OpenAI',    inPrice: 0.20,  outPrice: 1.25  },
  { id: 'claude-opus-4-7',       name: 'Claude Opus 4.7',      provider: 'Anthropic', inPrice: 5.00,  outPrice: 25.00 },
  { id: 'claude-sonnet-4-6',     name: 'Claude Sonnet 4.6',    provider: 'Anthropic', inPrice: 3.00,  outPrice: 15.00 },
  { id: 'claude-haiku-4-5',      name: 'Claude Haiku 4.5',     provider: 'Anthropic', inPrice: 1.00,  outPrice: 5.00  },
  { id: 'gemini-3-1-pro',        name: 'Gemini 3.1 Pro',       provider: 'Google',    inPrice: 2.00,  outPrice: 12.00 },
  { id: 'gemini-3-5-flash',      name: 'Gemini 3.5 Flash',     provider: 'Google',    inPrice: 1.50,  outPrice: 9.00  },
  { id: 'gemini-3-flash',        name: 'Gemini 3 Flash',       provider: 'Google',    inPrice: 0.50,  outPrice: 3.00  },
  { id: 'gemini-3-1-flash-lite', name: 'Gemini 3.1 Flash-Lite',provider: 'Google',    inPrice: 0.25,  outPrice: 1.50  },
];

// ─── Light Palette Constants (mirrors CSS vars) ───────────────────────────────
const C = {
  bg0:      '#f5fafc', // page
  bg1:      '#ffffff', // card
  bg2:      '#eff4f7', // sub-surface / input trough
  border1:  '#dee3e6', // card borders
  border2:  '#bcc9cd', // input borders
  text1:    '#171d1e', // primary text
  text2:    '#3d494c', // secondary text
  text3:    '#6d797d', // muted text
  primary:  '#00687a', // teal accent
  cheapest: '#00687a', // best-value teal
};

// ─── App State ────────────────────────────────────────────────────────────────
const state = {
  text:            '',
  inputTokens:     0,
  chars:           0,
  multiplier:      2.0,
  dailyCalls:      1000,
  calculatedCosts: [],
  tiktokenReady:   false,
  encoder:         null,
};

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const DOM = {
  input:        () => $('promptInput'),
  tokenCount:   () => $('tokenCount'),
  charCount:    () => $('charCount'),
  outTokensEst: () => $('outTokensEst'),
  slider:       () => $('outputMultiplier'),
  sliderVal:    () => $('multiplierValue'),
  callsInput:   () => $('dailyCalls'),
  grid:         () => $('modelsGrid'),
  chart:        () => $('chartContainer'),
  volDisplay:   () => $('monthlyVolumeDisplay'),
  copyBtn:      () => $('copyStatsBtn'),
  statusDot:    () => $('statusDot'),
  statusText:   () => $('statusText'),
};

// ─── Formatters ───────────────────────────────────────────────────────────────

/** Per-call cost: 6 decimal places */
function fmtCall(n) {
  if (n === 0) return '—';
  if (n < 0.000001) return '< $0.000001';
  return '$' + n.toFixed(6);
}

/** Split cost (input/output): 4 decimal places */
function fmtSplit(n) {
  if (n === 0) return '—';
  if (n < 0.0001) return '< $0.0001';
  return '$' + n.toFixed(4);
}

/** Monthly aggregate: 2 decimal places, USD formatted */
function fmtMonthly(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}

/** Integer with locale commas */
function fmtInt(n) {
  return new Intl.NumberFormat('en-US').format(n);
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

async function initTokenizer() {
  try {
    const { encodingForModel } = await import('https://esm.sh/tiktoken-lite');
    state.encoder = encodingForModel('gpt-4');
    state.tiktokenReady = true;
    setStatus('ready');
  } catch (e) {
    console.warn('[calc] tiktoken-lite unavailable, using estimator:', e);
    setStatus('estimated');
  }
}

function countTokens(text) {
  if (!text.trim()) return 0;
  if (state.tiktokenReady && state.encoder) {
    try { return state.encoder.encode(text).length; } catch (_) {}
  }
  // Fallback heuristic: ~1.3 tokens / word
  return Math.ceil((text.match(/[\w]+|[^\w\s]/g) || []).length * 1.3);
}

// ─── Status indicator ─────────────────────────────────────────────────────────

function setStatus(mode) {
  const dot  = DOM.statusDot();
  const text = DOM.statusText();
  if (!dot || !text) return;

  const MAP = {
    loading:   { bg: '#bcc9cd', label: 'initialising…',      color: '#6d797d'  },
    ready:     { bg: '#00687a', label: 'tiktoken ready',      color: '#00687a'  },
    estimated: { bg: '#8c5000', label: 'estimating tokens',   color: '#8c5000'  },
  };
  const s = MAP[mode] || MAP.loading;
  dot.style.background = s.bg;
  if (mode === 'ready') dot.style.animation = 'none'; // stop pulse
  text.textContent  = s.label;
  text.style.color  = s.color;
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// ─── Calculation ──────────────────────────────────────────────────────────────

function calculateCosts() {
  const outTokens  = Math.round(state.inputTokens * state.multiplier);
  const monthlyVol = state.dailyCalls * 30;

  const vd = DOM.volDisplay();
  if (vd) vd.textContent = fmtInt(monthlyVol);

  const ote = DOM.outTokensEst();
  if (ote) ote.textContent = state.inputTokens > 0 ? fmtInt(outTokens) : '—';

  state.calculatedCosts = MODELS.map(m => {
    const inCost       = (state.inputTokens / 1_000_000) * m.inPrice;
    const outCost      = (outTokens         / 1_000_000) * m.outPrice;
    const totalPerCall = inCost + outCost;
    const dailyCost    = totalPerCall * state.dailyCalls;
    const monthlyCost  = totalPerCall * monthlyVol;
    return { ...m, inCost, outCost, totalPerCall, dailyCost, monthlyCost, isCheapest: false };
  });

  state.calculatedCosts.sort((a, b) => a.totalPerCall - b.totalPerCall);
  if (state.inputTokens > 0 && state.calculatedCosts.length)
    state.calculatedCosts[0].isCheapest = true;

  renderGrid();
  renderChart();
}

// ─── Grid ─────────────────────────────────────────────────────────────────────

function renderGrid() {
  const grid = DOM.grid();
  if (!grid) return;

  if (state.inputTokens === 0) {
    grid.innerHTML = `
      <div style="border:1.5px dashed ${C.border1};background:${C.bg1};border-radius:12px"
           class="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <span class="material-symbols-outlined text-5xl mb-4" style="color:${C.border2}">calculate</span>
        <p class="font-mono text-sm" style="color:${C.text3}">
          Awaiting input — paste a prompt above to begin
        </p>
      </div>`;
    return;
  }

  grid.innerHTML = state.calculatedCosts.map((m, i) => {
    const prov  = PROVIDERS[m.provider];
    const cheap = m.isCheapest;

    /* card border/shadow changes for cheapest */
    const cardBorder = cheap
      ? `2px solid ${C.primary}`
      : `1px solid ${C.border1}`;
    const cardShadow = cheap
      ? `0 4px 20px rgba(0,104,122,0.12), 0 2px 8px rgba(0,104,122,0.06)`
      : `0 2px 8px rgba(23,29,30,0.05)`;

    /* total-per-call row colours */
    const totalBg     = cheap ? 'rgba(0,104,122,0.07)' : C.bg2;
    const totalBorder = cheap ? 'rgba(0,104,122,0.22)' : C.border1;
    const totalColor  = cheap ? C.primary              : C.text1;
    const labelColor  = cheap ? C.primary              : C.text3;

    return `
      <div id="card-${m.id}"
           class="relative flex flex-col gap-4 transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-lg"
           style="background:${C.bg1};border:${cardBorder};border-radius:12px;
                  padding:20px;box-shadow:${cardShadow};
                  animation:fadeInUp 0.28s ease forwards ${i * 0.04}s;
                  opacity:0;transform:translateY(12px)">

        ${cheap ? `
          <div style="position:absolute;top:-13px;left:16px;
                      background:${C.primary};color:#fff;
                      font-family:'JetBrains Mono',monospace;
                      font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
                      padding:3px 10px;border-radius:99px;
                      display:flex;align-items:center;gap:4px;
                      box-shadow:0 2px 8px rgba(0,104,122,0.3)">
            <span class="material-symbols-outlined" style="font-size:13px;font-variation-settings:'FILL' 1">stars</span>
            Best Value
          </div>` : ''}

        <!-- Provider badge + name -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="display:flex;flex-direction:column;gap:6px">
            <span style="display:inline-flex;align-items:center;gap:5px;
                         padding:2px 9px;border-radius:99px;
                         background:${prov.badgeBg};color:${prov.badgeColor};
                         border:1px solid ${prov.badgeBorder};
                         font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;
                         letter-spacing:0.04em">
              <span class="material-symbols-outlined"
                    style="font-size:13px;font-variation-settings:'FILL' 1;color:${prov.color}">${prov.icon}</span>
              ${m.provider}
            </span>
            <h3 style="font-family:'Hanken Grotesk',sans-serif;font-size:18px;font-weight:700;
                       color:${C.text1};line-height:1.2;letter-spacing:-0.01em;margin:0">
              ${m.name}
            </h3>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <p style="font-family:'JetBrains Mono',monospace;font-size:9px;
                      text-transform:uppercase;letter-spacing:0.1em;
                      color:${C.text3};margin:0 0 2px">$/1M in</p>
            <p style="font-family:'JetBrains Mono',monospace;font-size:12px;
                      color:${C.text2};font-weight:600;margin:0">$${m.inPrice.toFixed(2)}</p>
          </div>
        </div>

        <!-- Input / Output cost boxes -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto">
          <div style="display:flex;flex-direction:column;padding:10px 12px;
                      background:${C.bg2};border:1px solid ${C.border1};border-radius:8px">
            <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                         text-transform:uppercase;letter-spacing:0.1em;
                         color:${C.text3};margin-bottom:4px">Input cost</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                         font-weight:600;color:${C.text2}">${fmtSplit(m.inCost)}</span>
          </div>
          <div style="display:flex;flex-direction:column;padding:10px 12px;
                      background:${C.bg2};border:1px solid ${C.border1};border-radius:8px">
            <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                         text-transform:uppercase;letter-spacing:0.1em;
                         color:${C.text3};margin-bottom:4px">Output cost</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                         font-weight:600;color:${C.text2}">${fmtSplit(m.outCost)}</span>
          </div>
        </div>

        <!-- Total / call hero row -->
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 14px;border-radius:8px;
                    background:${totalBg};border:1px solid ${totalBorder}">
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;
                       text-transform:uppercase;letter-spacing:0.08em;
                       color:${labelColor};font-weight:600">Total / call</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:19px;
                       font-weight:800;color:${totalColor};letter-spacing:-0.02em">${fmtCall(m.totalPerCall)}</span>
        </div>
      </div>`;
  }).join('');
}

// ─── Chart ────────────────────────────────────────────────────────────────────

function renderChart() {
  const chart = DOM.chart();
  if (!chart) return;

  if (state.inputTokens === 0) {
    chart.innerHTML = `
      <div style="text-align:center;padding:40px 0;
                  font-family:'JetBrains Mono',monospace;font-size:13px;color:${C.border2}">
        No data to visualise yet
      </div>`;
    return;
  }

  const maxMo = Math.max(...state.calculatedCosts.map(m => m.monthlyCost), 0.000001);

  chart.innerHTML = state.calculatedCosts.map(m => {
    const pct  = (m.monthlyCost / maxMo) * 100;
    const prov = PROVIDERS[m.provider];
    const barColor = m.isCheapest ? C.primary : prov.color;

    return `
      <div style="display:flex;flex-direction:column;gap:6px;
                  padding:12px 0;border-bottom:1px solid ${C.border1}"
           class="last:border-0">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="display:flex;align-items:center;gap:7px;
                       font-family:'JetBrains Mono',monospace;font-size:13px;color:${C.text2}">
            <span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${barColor}"></span>
            ${m.name}
            ${m.isCheapest
              ? `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                              font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
                              color:${C.primary};
                              background:rgba(0,104,122,0.08);
                              border:1px solid rgba(0,104,122,0.2);
                              padding:1px 7px;border-radius:99px">Cheapest</span>`
              : ''}
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:14px;
                       font-weight:700;color:${C.text1}">
            ${fmtMonthly(m.monthlyCost)}
            <span style="font-weight:400;font-size:11px;color:${C.text3}">/mo</span>
          </span>
        </div>

        <!-- Bar track -->
        <div style="width:100%;background:${C.bg2};border-radius:99px;
                    height:8px;overflow:hidden;border:1px solid ${C.border1}">
          <div class="bar-fill"
               style="height:100%;border-radius:99px;width:${pct}%;
                      background:${barColor};opacity:0.75"></div>
        </div>

        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${C.text3}">
          Daily: ${fmtMonthly(m.dailyCost)} · ${fmtInt(state.dailyCalls * 30)} calls/mo
        </div>
      </div>`;
  }).join('');
}

// ─── Input handlers ───────────────────────────────────────────────────────────

const debouncedUpdate = debounce(() => {
  const text        = DOM.input()?.value ?? '';
  state.text        = text;
  state.chars       = text.length;
  state.inputTokens = countTokens(text);

  const tc = DOM.tokenCount();
  const cc = DOM.charCount();
  if (tc) tc.textContent = state.inputTokens > 0 ? fmtInt(state.inputTokens) : '—';
  if (cc) cc.textContent = state.chars > 0        ? fmtInt(state.chars)       : '—';

  calculateCosts();
}, 150);

// ─── Copy Stats ───────────────────────────────────────────────────────────────

function copyStats() {
  if (state.inputTokens === 0) return;
  const best    = state.calculatedCosts[0];
  const outToks = Math.round(state.inputTokens * state.multiplier);
  const text    =
`Tokens: ${fmtInt(state.inputTokens)} | Output est: ${fmtInt(outToks)} | Cheapest: ${best.name} (${fmtCall(best.totalPerCall)})`;

  navigator.clipboard.writeText(text).then(() => {
    const btn = DOM.copyBtn();
    if (!btn) return;
    const orig = btn.innerHTML;
    btn.innerHTML = `
      <span class="material-symbols-outlined text-[17px]"
            style="color:#00687a;font-variation-settings:'FILL' 1">check_circle</span>
      <span class="font-mono text-[11px] uppercase tracking-widest"
            style="color:#00687a">Copied!</span>`;
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function init() {
  DOM.input()?.addEventListener('input', debouncedUpdate);

  DOM.slider()?.addEventListener('input', e => {
    const val = parseFloat(e.target.value).toFixed(1);
    const dv  = DOM.sliderVal();
    if (dv) dv.textContent = `${val}x`;
    state.multiplier = parseFloat(val);
    calculateCosts();
  });

  DOM.callsInput()?.addEventListener('input', e => {
    state.dailyCalls = Math.max(1, parseInt(e.target.value) || 1);
    calculateCosts();
  });

  DOM.copyBtn()?.addEventListener('click', copyStats);

  // Initial render + tokenizer boot
  renderGrid();
  renderChart();
  setStatus('loading');
  initTokenizer();
}
