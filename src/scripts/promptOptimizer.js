/**
 * promptOptimizer.js — Client-side heuristic prompt minimizer.
 * Preserves intent while reducing tokens via structure and concision.
 */

const POLITENESS = [
  /\bplease\b/gi,
  /\bkindly\b/gi,
  /\bcould you\b/gi,
  /\bwould you\b/gi,
  /\bcan you\b/gi,
  /\bwill you\b/gi,
  /\bi(?:'d| would) like you to\b/gi,
  /\bi want you to\b/gi,
  /\bi need you to\b/gi,
  /\bif you (?:could|would|can)\b/gi,
  /\bthank you in advance\b/gi,
  /\bthanks in advance\b/gi,
];

const FILLER_PHRASES = [
  [/\bin order to\b/gi, 'to'],
  [/\bso that you can\b/gi, 'to'],
  [/\bmake sure (?:that )?/gi, 'ensure '],
  [/\bit is important (?:that|to)\b/gi, 'ensure '],
  [/\bit's important (?:that|to)\b/gi, 'ensure '],
  [/\bat this point in time\b/gi, 'now'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'regarding'],
  [/\bwith respect to\b/gi, 'regarding'],
  [/\bas well as\b/gi, 'and'],
  [/\bin addition to\b/gi, 'also '],
  [/\bthe fact that\b/gi, 'that'],
  [/\bgoing forward\b/gi, ''],
  [/\bat all times\b/gi, 'always'],
  [/\ball of the\b/gi, 'all'],
  [/\beach and every\b/gi, 'every'],
  [/\bin my opinion\b/gi, ''],
  [/\bto be honest\b/gi, ''],
  [/\bfor what it's worth\b/gi, ''],
  [/\bi would like\b/gi, ''],
  [/\bi want\b/gi, ''],
  [/\byou should make sure\b/gi, 'ensure'],
  [/\bdon't forget to\b/gi, ''],
  [/\bremember to\b/gi, ''],
];

const SENTENCE_START_FILLERS = [
  /^(?:basically|actually|simply|really|very|quite|rather|just)\s+/i,
  /^(?:note that|please note that|keep in mind that)\s+/i,
];

const VERBOSE_TO_CONCISE = [
  [/\butilize\b/gi, 'use'],
  [/\butilise\b/gi, 'use'],
  [/\bfacilitate\b/gi, 'enable'],
  [/\bleverage\b/gi, 'use'],
  [/\bapproximately\b/gi, '~'],
  [/\b(?:is|are) required to\b/gi, 'must'],
  [/\b(?:is|are) able to\b/gi, 'can'],
  [/\bdo not\b/gi, "don't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\b(?:a|the) number of\b/gi, ''],
  [/\b(?:in|with) (?:a|an) (?:timely|efficient) manner\b/gi, 'efficiently'],
];

const IMPERATIVE_START =
  /^(?:ensure|provide|write|create|list|analyze|analyse|generate|return|include|avoid|use|do|don't|format|output|give|explain|summarize|summarise|describe|identify|extract|compare|evaluate|implement|fix|update|remove|add|build|design|follow|keep|maintain|focus|prioritize|prioritise|respond|answer|translate|convert|parse|validate|check|review|refactor|optimize|optimise)\b/i;

function normalizeWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function applyPatterns(text, patterns) {
  let result = text;
  for (const re of patterns) {
    result = result.replace(re, '');
  }
  return result;
}

function applyReplacements(text, pairs) {
  let result = text;
  for (const [re, replacement] of pairs) {
    result = result.replace(re, replacement);
  }
  return result;
}

function trimSentenceFillers(sentence) {
  let s = sentence.trim();
  for (const re of SENTENCE_START_FILLERS) {
    s = s.replace(re, '');
  }
  return s.trim();
}

function dedupeLines(text) {
  const seen = new Set();
  return text
    .split('\n')
    .filter(line => {
      const key = line.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!key) return true;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('\n');
}

function dedupeSentencesInBlock(text) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return text;

  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const key = part.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimSentenceFillers(part));
  }
  return out.join(' ');
}

function structureInstructions(text) {
  if (/^[\s]*[-*•]\s/m.test(text)) {
    return text
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (/^[-*•]\s/.test(trimmed)) return trimmed.replace(/^[-*•]\s*/, '- ');
        return `- ${trimmed}`;
      })
      .filter(Boolean)
      .join('\n');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.map(l => (l.startsWith('-') ? l : `- ${l}`)).join('\n');
  }

  if (text.includes(';')) {
    const items = text.split(';').map(s => s.trim()).filter(Boolean);
    if (items.length >= 2 && items.every(i => i.length < 220)) {
      return items.map(i => `- ${i.replace(/^[-*•]\s*/, '')}`).join('\n');
    }
  }

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 2) {
    const trimmed = sentences.map(trimSentenceFillers);
    const imperatives = trimmed.filter(s => IMPERATIVE_START.test(s));
    if (imperatives.length >= 2 && imperatives.length >= trimmed.length * 0.6) {
      return trimmed.map(s => `- ${s.replace(/[.!?]+$/, '')}`).join('\n');
    }
  }

  return text;
}

function fixPunctuation(text) {
  return text
    .replace(/\bto to\b/gi, 'to')
    .replace(/\bensure that\b/gi, 'ensure')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,;])(?=[A-Za-z0-9])/g, '$1 ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s*[,;]\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function capitalizeBulletLines(text) {
  return text
    .split('\n')
    .map(line => {
      const m = line.match(/^(-\s*)(.*)$/);
      if (!m) return line;
      const body = m[2];
      if (!body) return line;
      return `${m[1]}${body.charAt(0).toUpperCase()}${body.slice(1)}`;
    })
    .join('\n');
}

function processBlock(block) {
  let text = block;
  text = applyPatterns(text, POLITENESS);
  text = applyReplacements(text, FILLER_PHRASES);
  text = applyReplacements(text, VERBOSE_TO_CONCISE);
  text = dedupeSentencesInBlock(text);
  return text.trim();
}

/**
 * @param {string} raw
 * @returns {string}
 */
export function optimizePrompt(raw) {
  if (!raw?.trim()) return '';

  const normalized = normalizeWhitespace(raw);
  const hasRolePrefix = /^(you are (?:a|an) [^\n.]+[.\n])/i.test(normalized);

  let text = normalized;

  if (hasRolePrefix) {
    const match = normalized.match(/^(you are (?:a|an) [^\n.]+[.]?)\s*/i);
    if (match) {
      const role = match[1].trim();
      const body = processBlock(normalized.slice(match[0].length));
      text = `${role}\n\n${structureInstructions(body)}`.trim();
    }
  } else {
    text = processBlock(text);
    text = structureInstructions(text);
  }

  text = dedupeLines(text);
  text = normalizeWhitespace(text);
  text = fixPunctuation(text);
  text = capitalizeBulletLines(text);

  if (!text.trim()) return normalized;

  if (text.length > normalized.length * 1.08) {
    text = fixPunctuation(
      applyReplacements(applyPatterns(normalized, POLITENESS), VERBOSE_TO_CONCISE),
    );
  }

  if (text === normalized) {
    text = structureInstructions(processBlock(normalized));
    text = fixPunctuation(normalizeWhitespace(text));
  }

  return text.trim() || normalized;
}
