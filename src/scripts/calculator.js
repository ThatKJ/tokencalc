/**
 * calculator.js — Core business logic (theme-aware via CSS custom properties)
 */

import { MODELS, PROVIDERS } from '../data/models.js';



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
  input:             () => $('promptInput'),
  tokenCount:        () => $('tokenCount'),
  charCount:         () => $('charCount'),
  outTokensEst:      () => $('outTokensEst'),
  headerTokenCount:  () => $('headerTokenCount'),
  headerOutputCount: () => $('headerOutputCount'),
  slider:            () => $('outputMultiplier'),
  sliderVal:         () => $('multiplierValue'),
  callsInput:        () => $('dailyCalls'),
  grid:              () => $('modelsGrid'),
  chart:             () => $('chartContainer'),
  volDisplay:        () => $('monthlyVolumeDisplay'),
  copyBtn:           () => $('copyStatsBtn'),
  statusDot:         () => $('statusDot'),
  statusText:        () => $('statusText'),
};

// ─── Formatters ───────────────────────────────────────────────────────────────
function fmtCall(n) {
  if (n === 0) return '—';
  if (n < 0.000001) return '< $0.000001';
  return '$' + n.toFixed(6);
}
function fmtSplit(n) {
  if (n === 0) return '—';
  if (n < 0.0001) return '< $0.0001';
  return '$' + n.toFixed(4);
}
function fmtMonthly(n) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n);
}
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
    if (DOM.input()?.value) debouncedUpdate();
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
  return Math.ceil((text.match(/[\w]+|[^\w\s]/g) || []).length * 1.3);
}

/** Token count for arbitrary text (e.g. optimize comparison). */
export function getTokenCount(text) {
  return countTokens(text);
}

// ─── Status indicator ─────────────────────────────────────────────────────────
function setStatus(mode) {
  const dot  = DOM.statusDot();
  const text = DOM.statusText();
  if (!dot || !text) return;
  const MAP = {
    loading:   { bg: 'var(--s5)', label: 'initialising…',    color: 'var(--t3)'   },
    ready:     { bg: 'var(--primary)', label: 'tiktoken ready',    color: 'var(--primary)' },
    estimated: { bg: 'var(--amber)',   label: 'estimating tokens', color: 'var(--amber)'   },
  };
  const s = MAP[mode] || MAP.loading;
  dot.style.background = s.bg;
  if (mode === 'ready') dot.style.animation = 'none';
  text.textContent = s.label;
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

  const vd  = DOM.volDisplay();
  const ote = DOM.outTokensEst();
  const hoc = DOM.headerOutputCount();

  if (vd)  vd.textContent  = fmtInt(monthlyVol);
  if (ote) ote.textContent = state.inputTokens > 0 ? fmtInt(outTokens) : '—';
  if (hoc) hoc.textContent = state.inputTokens > 0 ? fmtInt(outTokens) : '—';

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
      <div style="border:1.5px dashed var(--s4);background:var(--s1);border-radius:12px;
                  transition:border-color 0.2s,background 0.2s"
           class="col-span-full flex flex-col items-center justify-center py-14 sm:py-20 text-center px-4">
        <span class="material-symbols-outlined text-4xl sm:text-5xl mb-3 sm:mb-4" style="color:var(--s5)">calculate</span>
        <p class="font-mono text-xs sm:text-sm" style="color:var(--t3)">
          Awaiting input — paste a prompt above to begin
        </p>
      </div>`;
    return;
  }

  grid.innerHTML = state.calculatedCosts.map((m, i) => {
    const prov  = PROVIDERS[m.provider];
    const cheap = m.isCheapest;

    const cardBorder = cheap ? '2px solid var(--primary)' : '1px solid var(--s4)';
    const cardShadow = cheap
      ? '0 4px 20px var(--primary-border), 0 2px 8px var(--primary-border)'
      : '0 2px 8px rgba(0,0,0,0.07)';
    const totalBg     = cheap ? 'var(--primary-tint)' : 'var(--s2)';
    const totalBorder = cheap ? 'var(--primary-border)' : 'var(--s4)';
    const totalColor  = cheap ? 'var(--primary)'         : 'var(--t1)';
    const labelColor  = cheap ? 'var(--primary)'         : 'var(--t3)';

    return `
      <div id="card-${m.id}"
           class="model-card relative flex flex-col gap-3 sm:gap-4"
           style="background:var(--s1);border:${cardBorder};border-radius:12px;
                  padding:16px;box-shadow:${cardShadow};
                  animation:fadeInUp 0.28s ease forwards ${i * 0.04}s;
                  opacity:0;transform:translateY(12px);
                  border-left:${cheap ? '4px solid #16a34a' : '1px solid var(--s4)'};
                  transition:transform 0.2s ease,box-shadow 0.2s ease,border-color 0.2s ease;
                  cursor:default">

        ${cheap ? `
          <div style="position:absolute;top:-13px;left:14px;
                      background:#16a34a;color:#fff;
                      font-family:'JetBrains Mono',monospace;
                      font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;
                      padding:3px 10px;border-radius:99px;
                      display:flex;align-items:center;gap:4px;
                      box-shadow:0 2px 8px rgba(22,163,74,0.3)">
            <span class="material-symbols-outlined" style="font-size:13px;font-variation-settings:'FILL' 1">stars</span>
            Best Value
          </div>` : ''}

        <!-- Provider badge + name -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px">
          <div style="display:flex;flex-direction:column;gap:6px;min-width:0">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${prov.badge}">
              <span class="material-symbols-outlined text-[13px]">${prov.icon}</span>
              ${m.provider}
            </span>
            <h3 style="font-family:'Hanken Grotesk',sans-serif;font-size:16px;font-weight:700;
                       color:var(--t1);line-height:1.2;letter-spacing:-0.01em;margin:0;word-break:break-word">
              ${m.name}
            </h3>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <p style="font-family:'JetBrains Mono',monospace;font-size:9px;
                      text-transform:uppercase;letter-spacing:0.1em;color:var(--t3);margin:0 0 2px">$/1M in</p>
            <p style="font-family:'JetBrains Mono',monospace;font-size:12px;
                      color:var(--t2);font-weight:600;margin:0">$${m.inPrice.toFixed(2)}</p>
          </div>
        </div>

        <!-- Input / Output cost boxes -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:auto">
          <div style="display:flex;flex-direction:column;padding:10px 12px;
                      background:var(--s2);border:1px solid var(--s4);border-radius:8px;min-width:0;
                      transition:background 0.15s,border-color 0.15s">
            <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                         text-transform:uppercase;letter-spacing:0.1em;color:var(--t3);margin-bottom:4px">Input cost</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                         font-weight:600;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fmtSplit(m.inCost)}</span>
          </div>
          <div style="display:flex;flex-direction:column;padding:10px 12px;
                      background:var(--s2);border:1px solid var(--s4);border-radius:8px;min-width:0;
                      transition:background 0.15s,border-color 0.15s">
            <span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                         text-transform:uppercase;letter-spacing:0.1em;color:var(--t3);margin-bottom:4px">Output cost</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                         font-weight:600;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${fmtSplit(m.outCost)}</span>
          </div>
        </div>

        <!-- Total / call hero row -->
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:10px 14px;border-radius:8px;gap:8px;
                    background:${totalBg};border:1px solid ${totalBorder};
                    transition:background 0.15s,border-color 0.15s">
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;
                       text-transform:uppercase;letter-spacing:0.08em;color:${labelColor};font-weight:600">Total / call</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:18px;
                       font-weight:800;color:${totalColor};letter-spacing:-0.02em;
                       font-variant-numeric:tabular-nums">${fmtCall(m.totalPerCall)}</span>
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
      <div class="font-mono text-xs sm:text-sm text-center py-12" style="color:var(--s5)">
        No data to visualise yet
      </div>`;
    return;
  }

  const maxMo = Math.max(...state.calculatedCosts.map(m => m.monthlyCost), 0.000001);

  chart.innerHTML = state.calculatedCosts.map(m => {
    const pct      = (m.monthlyCost / maxMo) * 100;
    const prov     = PROVIDERS[m.provider];
    const barColor = m.isCheapest ? 'var(--primary)' : prov.color;

    return `
      <div class="chart-row">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="display:flex;align-items:center;gap:8px;min-width:0;
                       font-family:'JetBrains Mono',monospace;font-size:12px;
                       color:var(--t2);flex-wrap:wrap">
            <span style="width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${barColor};
                         box-shadow:0 0 6px ${barColor}60"></span>
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500">${m.name}</span>
            ${m.isCheapest
              ? `<span style="font-family:'JetBrains Mono',monospace;font-size:9px;
                              font-weight:700;text-transform:uppercase;letter-spacing:0.08em;
                              color:var(--primary);background:var(--primary-tint);
                              border:1px solid var(--primary-border);
                              padding:2px 8px;border-radius:99px">Cheapest</span>`
              : ''}
          </span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:13px;
                       font-weight:700;color:var(--t1);white-space:nowrap;
                       font-variant-numeric:tabular-nums">
            ${fmtMonthly(m.monthlyCost)}
            <span style="font-weight:400;font-size:11px;color:var(--t3)">/mo</span>
          </span>
        </div>

        <!-- Bar track -->
        <div style="width:100%;background:var(--s2);border-radius:99px;height:8px;overflow:hidden;border:1px solid var(--s4)">
          <div class="bar-fill"
               style="height:100%;border-radius:99px;width:${pct}%;background:${barColor};opacity:0.8"></div>
        </div>

        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--t3)">
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

  const tc  = DOM.tokenCount();
  const cc  = DOM.charCount();
  const htc = DOM.headerTokenCount();

  if (tc)  tc.textContent  = state.inputTokens > 0 ? fmtInt(state.inputTokens) : '—';
  if (cc)  cc.textContent  = state.chars > 0        ? fmtInt(state.chars)       : '—';
  if (htc) htc.textContent = state.inputTokens > 0 ? fmtInt(state.inputTokens) : '—';

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
            style="color:var(--primary);font-variation-settings:'FILL' 1">check_circle</span>
      <span class="font-mono text-[11px] uppercase tracking-widest"
            style="color:var(--primary)">Copied!</span>`;
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
