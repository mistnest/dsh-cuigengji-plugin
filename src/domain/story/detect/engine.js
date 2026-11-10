// AI-flavor prose detector. Adapted from Oh Story (story-deslop /
// story-review check-ai-patterns.js), Copyright (c) 2026 worldwonderer, MIT.
// See THIRD_PARTY_NOTICES.md. This port keeps the detection rules but drops the
// CLI surface: findings are candidates for the author to read, never a score.
//
// Design constraints of the port:
// - no filesystem, argv, process.exit or console output;
// - every rule reports chapter-relative line numbers so the workbench can jump
//   to the exact paragraph in the native manuscript;
// - a rule never rewrites text. The safe fix is contextual.

const STOP_CHARS = new Set(['。', '！', '？', '!', '?', '\n']);
const SOFT_SEPARATORS = new Set(['，', ',', '、', '；', ';', '：', ':']);
const MAX_POSITIVE_SPAN = 80;
const NEGATIVE_SETUP = /(?:不是|没有|不|并非)[^，。！？\n]{0,80}?[，,]\s*/;

const STUTTER_MIN_RUN = 6;
const STUTTER_MAX_SENTENCE = 5;
const LONG_PARAGRAPH_CHARS = 200;

const MICRO_TIC_PATTERN = /了(?:[一两三几半])?[下阵圈道声眼口气会]/g;
const MICRO_TIC_MIN_HITS = 5;
const NEGATION_PAIR_PATTERN = /(?:没有|没|不)[^，。！？；,!?\n]{1,10}[，,；]\s*[^，。！？；,!?\n]{0,6}?也(?:没有|没|不)/g;
const NEGATION_PAIR_MIN_HITS = 3;
const MICRO_TIC_PER_KILO = 6;

const STOCK_REACTION_PATTERNS = [
  /(?:指尖|手指|指节|手背|掌心|拳头|袖口|衣角|裙角|下唇|嘴唇|唇角|嘴角|眉头|眼底|眸光|目光|视线|肩膀|呼吸)[^。！？!?\n]{0,16}(?:轻轻|微微|缓缓|悄然|不自觉|无意识|下意识|攥紧|握紧|收紧|绞紧|泛白|发白|叩|敲|摩挲|抿紧|抿成|移开|垂下|躲开|一颤|颤了?一下|停了?一下|顿了?一下)/g,
  /(?:语气|声音)[^。！？!?\n]{0,12}(?:平静|冷静|平淡|冷淡|淡漠|平直)[^。！？!?\n]{0,12}(?:像|仿佛|如同|好像)[^。！？!?\n]{0,16}(?:念|读|报|说|陈述|宣判|背诵)/g,
  /(?:胸口|心口)[^。！？!?\n]{0,16}(?:像|仿佛|如同|好像)[^。！？!?\n]{0,16}(?:撞|锤|压|攥|堵)[^。！？!?\n]{0,8}(?:一下|一记|一拳)?/g,
  /(?:声音|嗓音|语气)[^。！？!?\n]{0,12}(?:放轻|压低|发紧|发颤|很轻|轻了些)/g,
  /(?:喉结|喉头|喉咙)[^。！？!?\n]{0,10}(?:滚|动|紧|堵|发涩|发干)/g,
  /(?:眼眶|眼圈|鼻子)[^。！？!?\n]{0,8}(?:发红|红了|发热|发酸|一酸)/g,
];
const STOCK_REACTION_MIN_HITS = 4;

const ACTION_VERBS = ['拿', '放', '走', '站', '坐', '转', '看', '说', '问', '答', '抬', '低', '推', '拉', '按', '握', '停', '笑'];
const ACTION_LIST_MIN_HITS = 5;

const CLICHE_TERMS = ['仿佛', '一丝', '一抹', '深吸一口气', '平静无波', '不由自主', '不可置信', '意味深长', '不易察觉', '几不可闻', '淡淡的', '微微', '缓缓'];
const CLICHE_PER_KILO = 4;

const METAPHOR_MARKERS = ['像', '好像', '仿佛', '如同', '宛如'];
const METAPHOR_PER_KILO = 5;

const REASONING_TERMS = ['知道', '明白', '这意味着', '必须', '需要', '意识到', '理解', '意味着'];
const REASONING_PER_KILO = 5;

const NOTICE_TERMS = ['【', '】', '系统', '规则', '判定', '任务', '提示', '警告'];
const NOTICE_MIN_HITS = 6;

const ABSTRACT_SUMMARY_TERMS = ['命运', '棋局', '这一刻', '终于明白', '才刚刚开始', '一切', '或许这就是', '注定'];
const ABSTRACT_MIN_HITS = 3;

const CONNECTIVES = ['但', '可', '而', '所以', '于是', '然后', '只是', '因为', '不过', '却', '也', '又', '便', '才'];

const QUOTE_EMPHASIS = /[“"][\u4e00-\u9fa5]{1,4}[”"]/g;
const QUOTE_EMPHASIS_MIN_HITS = 6;

const TRAILER_ENDING = /(?:没人知道|没有人知道|才刚刚开始|正朝着[^。！？\n]{0,20}(?:压|逼|涌|袭)了?(?:过来|过去|而来)|这才刚刚开始)/;
const TRAILER_SUMMARY = /(?:这一夜注定|这一切都结束了|一切都结束了|新的人生才刚刚开始|命运的齿轮|从此以后|一切都将改变|一切都变了)/;
const VOICE_CONTRAST = /(?:声音|嗓音|语气)(?:不高|不大|不响|不重)[^。！？\n]{0,30}(?:却|但)/;
const REVERSE_NOT_IS = /(?:是[^，。！？\n]{1,20}[，,]\s*不是)/;
const NEGATION_PARADE = /(?:没有[^。！？\n]{1,12}[，,]\s*没有[^。！？\n]{1,12}[，,]\s*(?:也)?没有)/;
const FORMULAIC_PARALLEL = /(?:不[^\s，。！？\n]{1,6}[，,]\s*不[^\s，。！？\n]{1,6})/;
const AFFIRMATIONS = ['而是', '其实是', '是', '只是', '却', '反而', '倒', '而'];

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const visibleLength = text => text.replace(/[\s“”"']/g, '').length;
const quotedRanges = text => {
  const ranges = [];
  const pattern = /[“"]([^”"]{0,400})[”"]/g;
  let match;
  while ((match = pattern.exec(text))) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
};
const insideRanges = (position, ranges) => ranges.some(([start, end]) => position >= start && position < end);
const maskQuoted = text => text.replace(/[“"][^”"]{0,400}[”"]/g, match => '　'.repeat(match.length));
const splitSentences = text => text.split(/(?<=[。！？!?])/).filter(item => item.trim());
const compact = text => text.replace(/\s+/g, ' ').trim().slice(0, 120);

const RULES = {
  'not-is-comparison': {severity: 'blocking', review: 'mechanical', layer: 'expression', message: '高频 AI 对比句式；删掉否定铺垫，直接写后项，或改成动作/细节呈现。'},
  'voice-contrast': {severity: 'blocking', review: 'mechanical', layer: 'expression', message: '音量反差腔（「声音不高……却……」），实战常见漏网句式；直接写说了什么、怎么说的。'},
  'negation-parade': {severity: 'blocking', review: 'mechanical', layer: 'expression', message: '否定排比（没有 X，没有 Y……）；连排否定通常可以压成一句具体描写。'},
  'reverse-not-is': {severity: 'blocking', review: 'mechanical', layer: 'expression', message: '反序对比（是 A，不是 B）；与「不是 A，而是 B」同源，改成直接陈述。'},
  'trailer-ending': {severity: 'blocking', review: 'mechanical', layer: 'narrative', message: '预告式总结收尾；结尾停在具体动作、画面或一句台词上，别替读者预告下一章。'},
  'trailer-summary': {severity: 'blocking', review: 'mechanical', layer: 'narrative', message: '章尾状态总结体；结尾设定要落成最后一个具体动作、画面或台词，别替读者盖章。'},
  'em-dash': {severity: 'blocking', review: 'mechanical', layer: 'expression', message: '破折号打断；按功能改写（停顿、补充或省略），不要用破折号代替句子。'},
  'long-paragraph': {severity: 'advisory', review: 'mechanical', layer: 'narrative', message: '段落过长；手机阅读按镜头断段。'},
  'period-stutter': {severity: 'advisory', review: 'mechanical', layer: 'expression', message: '碎句号：连续多个极短叙述句，缺少呼吸。'},
  'micro-action-tic': {severity: 'advisory', review: 'mechanical', layer: 'narrative', message: '微动作复读（「了下 / 了一下」式轻量补语高密度），易成电报体指纹。'},
  'negation-pair-tic': {severity: 'advisory', review: 'semantic', layer: 'expression', message: '否定对偶复读（「没 A，也没 B」）；一章多处时读起来像英文节奏。'},
  'cliche-density-tic': {severity: 'advisory', review: 'mechanical', layer: 'expression', message: '套词密度偏高（仿佛 / 一丝 / 深吸一口气 / 微微等聚集）。'},
  'stock-reaction-tic': {severity: 'advisory', review: 'semantic', layer: 'narrative', message: '套式反应细节（部位＋轻微动作、情绪尾巴）成片出现；逐处做删除测试。'},
  'action-list-tic': {severity: 'advisory', review: 'semantic', layer: 'narrative', message: '监控摄像头式动作清单：同段连续摆放动作动词，缺少视角温度。'},
  'abstract-summary-tic': {severity: 'advisory', review: 'semantic', layer: 'narrative', message: '抽象总结复读（命运 / 这一切 / 才刚刚开始），AI 结尾腔。'},
  'metaphor-density-tic': {severity: 'advisory', review: 'semantic', layer: 'expression', message: '比喻密度偏高（像 / 好像 / 仿佛 / 如同成片复现）。'},
  'reasoning-chain-tic': {severity: 'advisory', review: 'semantic', layer: 'logic', message: '解释链密度偏高（知道 / 明白 / 这意味着聚集），叙述者替读者下判断。'},
  'system-notice-formality-tic': {severity: 'advisory', review: 'semantic', layer: 'expression', message: '系统公告公文腔过密（方括号、规则行里硬规则词聚集）。'},
  'overcompressed-prose-tic': {severity: 'advisory', review: 'semantic', layer: 'narrative', message: '过度精炼：短叙述段过密且自然连接偏少。'},
  'low-connective-density-tic': {severity: 'advisory', review: 'semantic', layer: 'narrative', message: '低连接密度（引号外连接词偏少、中长句不足），像提纲或电报体。'},
  'quote-emphasis-tic': {severity: 'advisory', review: 'semantic', layer: 'expression', message: '叙述里给 1–4 字短词加引号强调，密度偏高。'},
  'formulaic-parallelism': {severity: 'advisory', review: 'semantic', layer: 'expression', message: '工整并列（「不 V A，不 V B」式），读起来像模板。'},
};

/** Paragraph-aware scan. A "line" is one physical line; paragraphs break on blank lines. */
export function scanProse(content) {
  const findings = [];
  const lines = String(content || '').replace(/\r\n/g, '\n').split('\n');
  const whole = lines.join('\n');
  const push = (type, line, column, excerpt) => {
    const rule = RULES[type];
    if (!rule) return;
    findings.push({type, severity: rule.severity, review: rule.review, layer: rule.layer, line, column, excerpt: compact(excerpt), message: rule.message});
  };
  // Per-line rules: cheap and precise enough for a workbench jump target.
  for (const [index, raw] of lines.entries()) {
    const lineNo = index + 1;
    if (!raw.trim()) continue;
    const text = raw;
    if (text.length > LONG_PARAGRAPH_CHARS) push('long-paragraph', lineNo, 1, text);
    for (const pattern of [/—{2}|——/, /——/]) {
      const match = pattern.exec(text);
      if (match) {push('em-dash', lineNo, match.index + 1, text.slice(match.index, match.index + 16)); break;}
    }
    for (const [type, pattern] of [['voice-contrast', VOICE_CONTRAST], ['reverse-not-is', REVERSE_NOT_IS], ['negation-parade', NEGATION_PARADE], ['trailer-ending', TRAILER_ENDING], ['trailer-summary', TRAILER_SUMMARY]]) {
      const match = pattern.exec(text);
      if (match) push(type, lineNo, match.index + 1, text.slice(match.index));
    }
    const masked = maskQuoted(text), ranges = quotedRanges(text);
    // Negative setup + positive flip inside one sentence. The "不是…，而是…"
    // form is the heaviest offender; without the explicit flip only flag a
    // sentence that also contradicts itself with 却/但/反而.
    for (const sentence of splitSentences(text)) {
      const at = text.indexOf(sentence);
      if (at < 0 || insideRanges(at, ranges)) continue;
      // MAX_NEGATIVE_SPAN is a constant, not a regex flag: build the pattern
      // once so the quantifier carries the number instead of a literal name.
      const negative = NEGATIVE_SETUP.exec(sentence);
      if (!negative) continue;
      const tail = sentence.slice(negative.index + negative[0].length);
      // 而是 is unambiguous. A bare 是 needs a contrast marker in the same
      // sentence: "他是不是凶手，是另一个问题" must stay clean.
      const flip = /^而是/.test(tail) || (/^(?:是|却|但|只是|反而)/.test(tail) && /却|但|反而|而是/.test(sentence));
      if (flip && tail.length <= MAX_POSITIVE_SPAN) push('not-is-comparison', lineNo, at + negative.index + 1, sentence);
    }
    const parallelism = FORMULAIC_PARALLEL.exec(masked);
    if (parallelism) push('formulaic-parallelism', lineNo, parallelism.index + 1, text.slice(parallelism.index, parallelism.index + 24));
  }
  // Paragraph-level and chapter-level density rules.
  const paragraphs = {};
  let current = [];
  const flush = () => {if (current.length) paragraphs[current[0].line] = current.map(item => item.text).join(''); current = [];};
  for (const [index, raw] of lines.entries()) {
    if (!raw.trim()) {flush(); continue;}
    current.push({line: index + 1, text: raw});
  }
  flush();
  const chapterText = lines.join('').replace(/\s/g, '');
  const kilo = Math.max(chapterText.length, 1) / 1000;
  const count = (text, terms) => terms.reduce((sum, term) => sum + text.split(term).length - 1, 0);
  for (const [start, text] of Object.entries(paragraphs).map(([key, value]) => [Number(key), value])) {
    // Micro actions only count outside dialogue: quoted speech is naturally terse.
    const narration = maskQuoted(text);
    const micro = (narration.match(MICRO_TIC_PATTERN) || []).length;
    if (micro >= MICRO_TIC_MIN_HITS && micro / kilo >= MICRO_TIC_PER_KILO) push('micro-action-tic', start, 1, text);
    if ((narration.match(NEGATION_PAIR_PATTERN) || []).length >= NEGATION_PAIR_MIN_HITS) push('negation-pair-tic', start, 1, text);
    const stock = STOCK_REACTION_PATTERNS.reduce((sum, pattern) => sum + (narration.match(pattern) || []).length, 0);
    if (stock >= STOCK_REACTION_MIN_HITS) push('stock-reaction-tic', start, 1, text);
    const actions = ACTION_VERBS.reduce((sum, verb) => sum + narration.split(verb).length - 1, 0);
    if (actions >= ACTION_LIST_MIN_HITS && !/[一-龥]的[一-龥]/.test(narration)) push('action-list-tic', start, 1, text);
    // Period stutter: a run of very short narration sentences without dialogue.
    const sentences = splitSentences(narration).filter(sentence => sentence.trim());
    let run = 0, worst = 0;
    for (const sentence of sentences) {
      if (visibleLength(sentence) <= STUTTER_MAX_SENTENCE) run++;
      else {worst = Math.max(worst, run); run = 0;}
    }
    if (Math.max(worst, run) >= STUTTER_MIN_RUN) push('period-stutter', start, 1, text);
  }
  const global = (type, hits, threshold, sample, scope = 1) => {if (hits >= threshold) push(type, scope, 1, sample);};
  const allNarration = maskQuoted(whole);
  global('cliche-density-tic', count(allNarration, CLICHE_TERMS), Math.max(2, Math.ceil(CLICHE_PER_KILO * kilo)), CLICHE_TERMS.join(' / '));
  global('metaphor-density-tic', count(allNarration, METAPHOR_MARKERS), Math.max(2, Math.ceil(METAPHOR_PER_KILO * kilo)), METAPHOR_MARKERS.join(' / '));
  global('reasoning-chain-tic', count(allNarration, REASONING_TERMS), Math.max(2, Math.ceil(REASONING_PER_KILO * kilo)), REASONING_TERMS.join(' / '));
  global('system-notice-formality-tic', count(whole, NOTICE_TERMS), NOTICE_MIN_HITS, NOTICE_TERMS.join(' / '));
  global('abstract-summary-tic', count(allNarration, ABSTRACT_SUMMARY_TERMS), ABSTRACT_MIN_HITS, ABSTRACT_SUMMARY_TERMS.join(' / '));
  global('quote-emphasis-tic', (allNarration.match(QUOTE_EMPHASIS) || []).length, QUOTE_EMPHASIS_MIN_HITS, '引号短词');
  const connectives = count(allNarration, CONNECTIVES);
  if (chapterText.length > 400 && connectives / kilo < 3) push('low-connective-density-tic', 1, 1, '连接词密度偏低');
  const shortParagraphs = Object.values(paragraphs).filter(text => visibleLength(maskQuoted(text)) <= 30).length;
  const totalParagraphs = Object.keys(paragraphs).length;
  if (totalParagraphs >= 8 && shortParagraphs / totalParagraphs > 0.7) push('overcompressed-prose-tic', 1, 1, '短叙述段过密');
  return findings;
}

/** Aggregate counts for a chapter. No score: the workbench never prints "AI 味 72 分". */
export function summarize(content, findings) {
  const totalChars = String(content || '').replace(/\s/g, '').length;
  const byType = new Map();
  for (const finding of findings) {
    const entry = byType.get(finding.type) || {type: finding.type, severity: finding.severity, review: finding.review, count: 0, blockingCount: 0};
    entry.count++;
    if (finding.severity === 'blocking') entry.blockingCount++;
    byType.set(finding.type, entry);
  }
  const counts = [...byType.values()].sort((a, b) => (b.severity === 'blocking') - (a.severity === 'blocking') || b.count - a.count || a.type.localeCompare(b.type));
  const blocking = counts.reduce((sum, item) => sum + item.blockingCount, 0);
  const advisory = counts.reduce((sum, item) => sum + item.count - item.blockingCount, 0);
  return {findings, counts, totalChars, perThousand: totalChars ? Math.round((findings.length / totalChars) * 10000) / 10 : 0,
    blocking, advisory, clean: findings.length === 0};
}

export const RULE_TABLE = RULES;
export const RULE_TYPES = Object.keys(RULES);
