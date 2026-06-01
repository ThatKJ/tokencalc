/**
 * toast.ts — Lightweight custom toast notification system.
 * No external dependencies. Self-contained, accessible, animated.
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  kind?: ToastKind;
  duration?: number;
  /** Optional aria-live politeness override. */
  ariaLive?: 'polite' | 'assertive';
}

interface ToastStyle {
  bg: string;
  border: string;
  text: string;
  accent: string;
  iconPath: string;
  iconStroke: string;
}

const STYLES: Record<ToastKind, ToastStyle> = {
  success: {
    bg:       'rgba(6, 78, 59, 0.96)',
    border:   'rgba(16, 185, 129, 0.45)',
    text:     '#ecfdf5',
    accent:   '#10b981',
    iconPath: 'M5 13l4 4L19 7',
    iconStroke: '#10b981',
  },
  error: {
    bg:       'rgba(76, 5, 25, 0.96)',
    border:   'rgba(244, 63, 94, 0.45)',
    text:     '#fff1f2',
    accent:   '#f43f5e',
    iconPath: 'M6 18L18 6M6 6l12 12',
    iconStroke: '#f43f5e',
  },
  info: {
    bg:       'rgba(8, 47, 73, 0.96)',
    border:   'rgba(56, 189, 248, 0.45)',
    text:     '#f0f9ff',
    accent:   '#38bdf8',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    iconStroke: '#38bdf8',
  },
  warning: {
    bg:       'rgba(67, 20, 7, 0.96)',
    border:   'rgba(245, 158, 11, 0.45)',
    text:     '#fffbeb',
    accent:   '#f59e0b',
    iconPath: 'M12 9v2m0 4h.01M5 19h14a2 2 0 001.732-3L13.732 4a2 2 0 00-3.464 0L3.268 16A2 2 0 005 19z',
    iconStroke: '#f59e0b',
  },
};

const DEFAULT_DURATION = 3200;
const MAX_VISIBLE = 4;
const ACTIVE_TOASTS: HTMLElement[] = [];
let containerEl: HTMLElement | null = null;
let counter = 0;

function ensureContainer(): HTMLElement {
  if (containerEl && document.body.contains(containerEl)) return containerEl;

  const el = document.createElement('div');
  el.id = 'tc-toast-container';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.style.cssText = [
    'position:fixed',
    'z-index:9999',
    'top:max(16px, env(safe-area-inset-top))',
    'right:max(16px, env(safe-area-inset-right))',
    'left:auto',
    'display:flex',
    'flex-direction:column',
    'gap:10px',
    'pointer-events:none',
    'max-width:min(92vw, 380px)',
  ].join(';');
  document.body.appendChild(el);
  containerEl = el;
  return el;
}

function dismiss(el: HTMLElement): void {
  el.style.transition = 'opacity 220ms ease, transform 220ms ease';
  el.style.opacity = '0';
  el.style.transform = 'translateY(-6px) scale(0.98)';
  window.setTimeout(() => {
    el.remove();
    const idx = ACTIVE_TOASTS.indexOf(el);
    if (idx > -1) ACTIVE_TOASTS.splice(idx, 1);
  }, 240);
}

function svgIcon(path: string, stroke: string): string {
  return `
    <svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.2"
         stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
         style="width:18px;height:18px;flex-shrink:0;display:block">
      <path d="${path}" />
    </svg>`;
}

function buildToastEl(message: string, style: ToastStyle, ariaLive: 'polite' | 'assertive'): HTMLElement {
  const id = `tc-toast-${++counter}`;
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('role', ariaLive === 'assertive' ? 'alert' : 'status');
  el.setAttribute('aria-live', ariaLive);
  el.style.cssText = [
    'display:flex',
    'align-items:flex-start',
    'gap:10px',
    'padding:12px 14px 12px 12px',
    'border-radius:12px',
    'background:' + style.bg,
    'border:1px solid ' + style.border,
    'color:' + style.text,
    'font-family:"Geist","Inter",system-ui,sans-serif',
    'font-size:13.5px',
    'line-height:1.45',
    'font-weight:500',
    'letter-spacing:-0.005em',
    'box-shadow:0 12px 32px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
    'backdrop-filter:blur(14px) saturate(160%)',
    '-webkit-backdrop-filter:blur(14px) saturate(160%)',
    'pointer-events:auto',
    'opacity:0',
    'transform:translateY(-6px) scale(0.98)',
    'transition:opacity 220ms ease, transform 260ms cubic-bezier(0.34,1.56,0.64,1)',
    'will-change:opacity,transform',
  ].join(';');

  el.innerHTML = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:26px;height:26px;border-radius:8px;
      background:rgba(255,255,255,0.08);
      border:1px solid rgba(255,255,255,0.10);
      flex-shrink:0;margin-top:1px;">
      ${svgIcon(style.iconPath, style.iconStroke)}
    </div>
    <div style="flex:1;min-width:0;padding-top:1px;">${escapeHtml(message)}</div>
    <button type="button" aria-label="Dismiss notification"
      style="
        appearance:none;border:0;background:transparent;
        color:rgba(255,255,255,0.55);cursor:pointer;
        width:24px;height:24px;border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;padding:0;line-height:0;
        transition:color 150ms ease,background-color 150ms ease;"
      onmouseover="this.style.color='#fff';this.style.backgroundColor='rgba(255,255,255,0.10)';"
      onmouseout="this.style.color='rgba(255,255,255,0.55)';this.style.backgroundColor='transparent';">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" aria-hidden="true" style="width:14px;height:14px;">
        <path d="M6 6l12 12M6 18L18 6" />
      </svg>
    </button>
  `;

  const dismissBtn = el.querySelector('button');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => dismiss(el));
  }

  return el;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showToast(opts: ToastOptions | string): void {
  const o: ToastOptions = typeof opts === 'string' ? { message: opts } : opts;
  const kind = o.kind ?? 'info';
  const style = STYLES[kind];
  const ariaLive = o.ariaLive ?? (kind === 'error' ? 'assertive' : 'polite');

  const container = ensureContainer();
  const el = buildToastEl(o.message, style, ariaLive);
  container.appendChild(el);
  ACTIVE_TOASTS.push(el);

  // Trim oldest if too many visible
  while (ACTIVE_TOASTS.length > MAX_VISIBLE) {
    const oldest = ACTIVE_TOASTS.shift();
    if (oldest) dismiss(oldest);
  }

  // Trigger enter animation
  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0) scale(1)';
  });

  const duration = Math.max(800, o.duration ?? DEFAULT_DURATION);
  window.setTimeout(() => dismiss(el), duration);
}

/** Convenience helpers. */
export const toast = {
  success: (msg: string, duration?: number) => showToast({ message: msg, kind: 'success', duration }),
  error:   (msg: string, duration?: number) => showToast({ message: msg, kind: 'error', duration }),
  info:    (msg: string, duration?: number) => showToast({ message: msg, kind: 'info', duration }),
  warning: (msg: string, duration?: number) => showToast({ message: msg, kind: 'warning', duration }),
};
