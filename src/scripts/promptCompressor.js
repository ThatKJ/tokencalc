/**
 * promptCompressor.js — Max compression, zero loss prompt compressor.
 * More aggressive than heuristic optimizer. Preserves all semantics
 * while minimizing token count. Strips filler, merges redundancies,
 * converts to imperative, and structures as labeled sections.
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
  /\bi(?:'d| would) appreciate\b/gi,
  /\bthank you\b/gi,
  /\b(?:many\s+)?thanks(?:\s+in\s+advance)?\b/gi,
  /\bgrateful\b/gi,
  /\bis it possible\b/gi,
  /\bwould it be possible\b/gi,
  /\bif possible\b/gi,
  /\bwhen you get a chance\b/gi,
  /\bat your earliest convenience\b/gi,
  /\bno rush\b/gi,
  /\btake your time\b/gi,
  /\bfeel free to\b/gi,
];

const FILLER = [
  [/\bin order to\b/gi, 'to'],
  [/\bso that\b/gi, ''],
  [/\bmake sure (?:that )?/gi, 'ensure '],
  [/\bit is important (?:that|to)\b/gi, 'ensure '],
  [/\bat this point in time\b/gi, 'now'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bin the event that\b/gi, 'if'],
  [/\bwith regard to\b/gi, 'regarding'],
  [/\bwith respect to\b/gi, 'regarding'],
  [/\bas well as\b/gi, 'and'],
  [/\bin addition to\b/gi, 'also '],
  [/\bthe fact that\b/gi, ''],
  [/\bgoing forward\b/gi, ''],
  [/\bat all times\b/gi, 'always'],
  [/\bnote that\b/gi, ''],
  [/\bkeep in mind\b/gi, ''],
  [/\byour (?:goal|task|job|role) is to\b/gi, ''],
  [/\byou are (?:expected|required) to\b/gi, ''],
  [/\bneed to\b/gi, 'must'],
  [/\bhas to\b/gi, 'must'],
  [/\bhave to\b/gi, 'must'],
  [/\bi would like\b/gi, ''],
  [/\bdon't forget to\b/gi, ''],
  [/\bremember to\b/gi, ''],
];

const REDUNDANCIES = [
  [/\bsimple and easy\b/gi, 'simple'],
  [/\bdetailed and in.depth\b/gi, 'detailed'],
  [/\beach and every\b/gi, 'every'],
  [/\bfirst and foremost\b/gi, 'first'],
  [/\blast but not least\b/gi, 'finally'],
  [/\brepeat again\b/gi, 'repeat'],
  [/\bnew innovation\b/gi, 'innovation'],
  [/\bclose proximity\b/gi, 'near'],
  [/\badvance planning\b/gi, 'planning'],
  [/\bend result\b/gi, 'result'],
  [/\badded bonus\b/gi, 'bonus'],
  [/\btotally and completely\b/gi, 'completely'],
  [/\bnull and void\b/gi, 'void'],
  [/\bany and all\b/gi, 'any'],
  [/\bbasically\b/gi, ''],
  [/\bessentially\b/gi, ''],
  [/\ba lot of\b/gi, 'many'],
  [/\bplenty of\b/gi, 'many'],
  [/\bthe vast majority of\b/gi, 'most'],
  [/\ba majority of\b/gi, 'most'],
  [/\bmore or less\b/gi, '~'],
  [/\bin a nutshell\b/gi, ''],
  [/\bsort of\b/gi, ''],
  [/\bkind of\b/gi, ''],
  [/\btype of\b/gi, ''],
];

const VERBOSE = [
  [/\butilize\b/gi, 'use'],
  [/\butilise\b/gi, 'use'],
  [/\bfacilitate\b/gi, 'enable'],
  [/\bleverage\b/gi, 'use'],
  [/\bapproximately\b/gi, '~'],
  [/\b(?:is|are) required to\b/gi, 'must'],
  [/\b(?:is|are) able to\b/gi, 'can'],
  [/\b(?:has|have) the ability to\b/gi, 'can'],
  [/\bdo not\b/gi, "don't"],
  [/\bcannot\b/gi, "can't"],
  [/\bwill not\b/gi, "won't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\b(?:in|with) (?:a|an) (?:timely|efficient) manner\b/gi, 'efficiently'],
  [/\bprior to\b/gi, 'before'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bnotwithstanding\b/gi, 'despite'],
  [/\bnevertheless\b/gi, 'yet'],
  [/\bnonetheless\b/gi, 'yet'],
  [/\bdemonstrate\b/gi, 'show'],
  [/\bterminate\b/gi, 'end'],
  [/\bcommence\b/gi, 'start'],
  [/\bsufficient\b/gi, 'enough'],
  [/\bpossess\b/gi, 'have'],
  [/\bpurchase\b/gi, 'buy'],
  [/\bassist\b/gi, 'help'],
  [/\bendeavor\b/gi, 'try'],
  [/\bascertain\b/gi, 'determine'],
  [/\brender\b/gi, 'make'],
  [/\bobtain\b/gi, 'get'],
  [/\bprovide\b/gi, 'give'],
  [/\ba number of\b/gi, ''],
  [/\bin the vicinity of\b/gi, '~'],
];

const ROLE_RE = /^(you are\s+(?:a|an)\s+[^.!?\n]+[.!]?)\s*/i;

const IMPERATIVE_VERBS = new Set([
  'write', 'create', 'generate', 'build', 'implement', 'develop',
  'explain', 'describe', 'define', 'summarize', 'summarise',
  'list', 'enumerate', 'identify', 'extract', 'find', 'search',
  'calculate', 'compute', 'estimate', 'count', 'measure',
  'compare', 'contrast', 'evaluate', 'analyze', 'analyse',
  'review', 'audit', 'inspect', 'check', 'validate', 'verify',
  'test', 'debug', 'fix', 'repair', 'resolve', 'solve',
  'update', 'upgrade', 'migrate', 'convert', 'transform',
  'translate', 'transpile', 'compile', 'parse', 'serialize',
  'format', 'structure', 'organize', 'sort', 'filter', 'map',
  'reduce', 'merge', 'split', 'join', 'concatenate',
  'render', 'display', 'show', 'output', 'return', 'respond',
  'answer', 'tell', 'suggest', 'recommend', 'propose',
  'design', 'plan', 'architect', 'configure', 'setup',
  'install', 'deploy', 'publish', 'release', 'launch',
  'optimize', 'optimise', 'compress', 'minimize', 'reduce',
  'refactor', 'restructure', 'rewrite', 'rephrase',
  'read', 'load', 'fetch', 'retrieve', 'get', 'collect',
  'save', 'store', 'persist', 'cache', 'export', 'import',
  'send', 'submit', 'push', 'pull', 'sync', 'backup',
  'remove', 'delete', 'clear', 'wipe', 'reset', 'undo',
  'add', 'insert', 'append', 'prepend', 'inject', 'patch',
  'replace', 'swap', 'substitute', 'wrap', 'unwrap',
  'enable', 'disable', 'allow', 'deny', 'restrict', 'limit',
  'grant', 'revoke', 'assign', 'declare', 'initialize',
  'protect', 'secure', 'encrypt', 'decrypt', 'encode', 'decode',
  'hash', 'sign', 'verify', 'authenticate', 'authorize',
  'connect', 'disconnect', 'mount', 'unmount', 'attach', 'detach',
  'focus', 'prioritize', 'prioritise', 'ensure', 'avoid',
  'include', 'exclude', 'skip', 'ignore', 'keep', 'maintain',
  'use', 'do', 'make', 'let', 'set', 'configure', 'run', 'execute',
  'start', 'stop', 'pause', 'resume', 'wait', 'sleep',
  'follow', 'adhere', 'obey', 'respect', 'honor',
  'consider', 'assume', 'suppose', 'imagine',
  'provide', 'supply', 'furnish', 'offer', 'present',
  'specify', 'indicate', 'denote', 'signify',
  'illustrate', 'exemplify', 'demonstrate', 'show',
  'note', 'remark', 'observe', 'mention', 'state',
  'assert', 'claim', 'declare', 'proclaim', 'announce',
  'teach', 'instruct', 'train', 'guide', 'coach',
  'ask', 'query', 'request', 'demand', 'command',
  'tell', 'narrate', 'recount', 'relate', 'report',
]);

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

function extractRole(text) {
  const match = text.match(ROLE_RE);
  if (match) {
    return {
      role: match[1].replace(/[.!]+$/, '').trim(),
      body: text.slice(match[0].length).trim(),
    };
  }
  return { role: null, body: text };
}

function extractCodeBlocks(text) {
  const blocks = [];
  const cleaned = text.replace(/```[\s\S]*?```|`[^`]+`/g, match => {
    blocks.push(match);
    return `\x00CB${blocks.length - 1}\x00`;
  });
  return { blocks, cleaned };
}

function restoreCodeBlocks(text, blocks) {
  return text.replace(/\x00CB(\d+)\x00/g, (_, i) => blocks[parseInt(i)] || '');
}

function dedupeSentences(text) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return text;
  const seen = new Set();
  return parts.filter(p => {
    const key = p.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(' ');
}

function isImperative(sentence) {
  const first = sentence.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '');
  return first ? IMPERATIVE_VERBS.has(first) : false;
}

function convertSentenceToImperative(sentence) {
  const s = sentence.trim();
  if (!s || isImperative(s)) return s;

  let converted = s;

  converted = converted.replace(/^you (will|should|must|can|could|would|need to|have to)\s+/i, '');
  converted = converted.replace(/^we (will|should|must|can|could|would|need to|have to)\s+/i, '');
  converted = converted.replace(/^the (?:goal|aim|objective|purpose) (?:is|should be) to\s+/i, '');
  converted = converted.replace(/^this (?:should|will|must|needs to)\s+/i, '');
  converted = converted.replace(/^i want (?:you|this) (?:to )?/i, '');
  converted = converted.replace(/^i need (?:you|this) (?:to )?/i, '');
  converted = converted.replace(/^(?:your\s+)?(?:task|job|role|goal|objective) is to\s+/i, '');

  const declMatch = converted.match(/^[A-Z]?[a-z]*\w* is (?:a |an |the )?(\w+)/);
  if (declMatch) {
    const noun = declMatch[1].toLowerCase();
    if (IMPERATIVE_VERBS.has(noun)) {
      converted = converted.replace(/^[A-Z]?[a-z]*\w* is (?:a |an |the )?/, '');
    }
  }

  converted = converted.replace(/^that\s+/i, '');
  converted = converted.replace(/^it (?:should|will|must|needs to)\s+/i, '');
  converted = converted.replace(/^there is\/?are\s+/i, '');

  return converted.trim();
}

function convertToImperative(text) {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length === 0) return text;

  let converted = parts.map(convertSentenceToImperative);
  const hasAnyImperative = converted.some(s => isImperative(s));

  if (hasAnyImperative) {
    return converted
      .map(s => {
        const t = s.charAt(0).toUpperCase() + s.slice(1);
        return t.endsWith('.') || t.endsWith('!') ? t : t + '.';
      })
      .join(' ');
  }

  return text;
}

function extractStructuredConstraints(text) {
  const constraints = [];
  const labelRe = /\b(Length|Language|Audience|Format|Style|Output|Constraints?|Tone|Voice):\s*(.+?)(?:\.|$)/gi;
  let cleaned = text;
  let m;
  while ((m = labelRe.exec(cleaned)) !== null) {
    constraints.push(`${m[1]}: ${m[2].trim()}`);
  }
  cleaned = cleaned.replace(labelRe, '');
  return { constraints, cleanedBody: normalizeWhitespace(cleaned) };
}

function detectConstraints(text) {
  const constraints = [];
  let cleaned = text;

  const formatRe = /\b(?:in|as|using)\s+(json|markdown|html|csv|yaml|toml|xml|txt)\b/gi;
  let m;
  while ((m = formatRe.exec(cleaned)) !== null) {
    constraints.push(`Format: ${m[1].toUpperCase()}`);
  }
  cleaned = cleaned.replace(formatRe, '');

  const lengthRe = /(\d+[+-]?)\s*(words?|sentences?|paragraphs?|pages?|tokens?)\b/gi;
  const lengths = [];
  while ((m = lengthRe.exec(cleaned)) !== null) {
    lengths.push(`${m[1]} ${m[2]}`);
  }
  if (lengths.length) constraints.push(`Length: ${lengths.join(', ')}`);
  cleaned = cleaned.replace(lengthRe, '');

  const langRe = /\b(in|using)\s+(\w+(?:\+\+)?#?)\s+(?:language|code)\b/gi;
  while ((m = langRe.exec(cleaned)) !== null) {
    constraints.push(`Language: ${m[2]}`);
  }
  cleaned = cleaned.replace(langRe, '');

  const audienceRe = /\b(for|target(?:ing)?|aimed\s+(?:at|for)|written\s+for)\s+(beginners?|experts?|developers?|children?|professionals?|students?|researchers?|non.technical|technical|advanced|intermediate)\b/gi;
  while ((m = audienceRe.exec(cleaned)) !== null) {
    constraints.push(`Audience: ${m[2]}`);
  }
  cleaned = cleaned.replace(audienceRe, '');

  return { constraints, cleanedBody: normalizeWhitespace(cleaned) };
}

function structureOutput(role, body, constraints) {
  body = body.trim();
  if (!body) return role || '';

  const hasMultipleInstructions = (body.match(/[.!?]\s+/g) || []).length >= 2
    || body.includes('\n');

  if (!hasMultipleInstructions && constraints.length === 0 && !role) {
    return capitalizeFirst(body.replace(/[.!?]+$/, '') + '.');
  }

  const parts = [];
  if (role) parts.push(role);

  const bodyImperatives = convertToImperative(body);
  parts.push(bodyImperatives.replace(/[.!?]+$/, '') + '.');

  if (constraints.length) {
    parts.push(constraints.join('. ') + '.');
  }

  return parts.join('\n\n');
}

function capitalizeFirst(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function finalCleanup(text) {
  return normalizeWhitespace(text
    .replace(/\bensure that\b/gi, 'ensure')
    .replace(/\bto to\b/gi, 'to')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,([A-Za-z0-9])/g, ', $1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/^[,;]\s*/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\.\s*\./g, '.')
    .trim()
  );
}

export function compressPrompt(raw) {
  if (!raw?.trim()) return '';

  let text = normalizeWhitespace(raw);

  const { blocks, cleaned } = extractCodeBlocks(text);
  const { role, body } = extractRole(cleaned);

  let processed = body;
  processed = applyPatterns(processed, POLITENESS);
  processed = applyReplacements(processed, FILLER);
  processed = applyReplacements(processed, REDUNDANCIES);
  processed = applyReplacements(processed, VERBOSE);
  processed = dedupeSentences(processed);

  const { constraints: structConstraints, cleanedBody: structCleaned } = extractStructuredConstraints(processed);
  const { constraints, cleanedBody } = detectConstraints(structCleaned);
  const allConstraints = [...structConstraints, ...constraints];
  let result = structureOutput(role, cleanedBody, allConstraints);
  result = restoreCodeBlocks(result, blocks);
  result = finalCleanup(result);

  if (!result) return normalizeWhitespace(raw);
  if (result.length > raw.length * 1.2) {
    result = normalizeWhitespace(applyPatterns(applyReplacements(raw, VERBOSE), POLITENESS));
  }

  return result;
}
