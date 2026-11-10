const STOP_CHARS = /* @__PURE__ */ new Set(["\u3002", "\uFF01", "\uFF1F", "!", "?", "\n"]);
const SOFT_SEPARATORS = /* @__PURE__ */ new Set(["\uFF0C", ",", "\u3001", "\uFF1B", ";", "\uFF1A", ":"]);
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
  /(?:眼眶|眼圈|鼻子)[^。！？!?\n]{0,8}(?:发红|红了|发热|发酸|一酸)/g
];
const STOCK_REACTION_MIN_HITS = 4;
const ACTION_VERBS = ["\u62FF", "\u653E", "\u8D70", "\u7AD9", "\u5750", "\u8F6C", "\u770B", "\u8BF4", "\u95EE", "\u7B54", "\u62AC", "\u4F4E", "\u63A8", "\u62C9", "\u6309", "\u63E1", "\u505C", "\u7B11"];
const ACTION_LIST_MIN_HITS = 5;
const CLICHE_TERMS = ["\u4EFF\u4F5B", "\u4E00\u4E1D", "\u4E00\u62B9", "\u6DF1\u5438\u4E00\u53E3\u6C14", "\u5E73\u9759\u65E0\u6CE2", "\u4E0D\u7531\u81EA\u4E3B", "\u4E0D\u53EF\u7F6E\u4FE1", "\u610F\u5473\u6DF1\u957F", "\u4E0D\u6613\u5BDF\u89C9", "\u51E0\u4E0D\u53EF\u95FB", "\u6DE1\u6DE1\u7684", "\u5FAE\u5FAE", "\u7F13\u7F13"];
const CLICHE_PER_KILO = 4;
const METAPHOR_MARKERS = ["\u50CF", "\u597D\u50CF", "\u4EFF\u4F5B", "\u5982\u540C", "\u5B9B\u5982"];
const METAPHOR_PER_KILO = 5;
const REASONING_TERMS = ["\u77E5\u9053", "\u660E\u767D", "\u8FD9\u610F\u5473\u7740", "\u5FC5\u987B", "\u9700\u8981", "\u610F\u8BC6\u5230", "\u7406\u89E3", "\u610F\u5473\u7740"];
const REASONING_PER_KILO = 5;
const NOTICE_TERMS = ["\u3010", "\u3011", "\u7CFB\u7EDF", "\u89C4\u5219", "\u5224\u5B9A", "\u4EFB\u52A1", "\u63D0\u793A", "\u8B66\u544A"];
const NOTICE_MIN_HITS = 6;
const ABSTRACT_SUMMARY_TERMS = ["\u547D\u8FD0", "\u68CB\u5C40", "\u8FD9\u4E00\u523B", "\u7EC8\u4E8E\u660E\u767D", "\u624D\u521A\u521A\u5F00\u59CB", "\u4E00\u5207", "\u6216\u8BB8\u8FD9\u5C31\u662F", "\u6CE8\u5B9A"];
const ABSTRACT_MIN_HITS = 3;
const CONNECTIVES = ["\u4F46", "\u53EF", "\u800C", "\u6240\u4EE5", "\u4E8E\u662F", "\u7136\u540E", "\u53EA\u662F", "\u56E0\u4E3A", "\u4E0D\u8FC7", "\u5374", "\u4E5F", "\u53C8", "\u4FBF", "\u624D"];
const QUOTE_EMPHASIS = /[“"][\u4e00-\u9fa5]{1,4}[”"]/g;
const QUOTE_EMPHASIS_MIN_HITS = 6;
const TRAILER_ENDING = /(?:没人知道|没有人知道|才刚刚开始|正朝着[^。！？\n]{0,20}(?:压|逼|涌|袭)了?(?:过来|过去|而来)|这才刚刚开始)/;
const TRAILER_SUMMARY = /(?:这一夜注定|这一切都结束了|一切都结束了|新的人生才刚刚开始|命运的齿轮|从此以后|一切都将改变|一切都变了)/;
const VOICE_CONTRAST = /(?:声音|嗓音|语气)(?:不高|不大|不响|不重)[^。！？\n]{0,30}(?:却|但)/;
const REVERSE_NOT_IS = /(?:是[^，。！？\n]{1,20}[，,]\s*不是)/;
const NEGATION_PARADE = /(?:没有[^。！？\n]{1,12}[，,]\s*没有[^。！？\n]{1,12}[，,]\s*(?:也)?没有)/;
const FORMULAIC_PARALLEL = /(?:不[^\s，。！？\n]{1,6}[，,]\s*不[^\s，。！？\n]{1,6})/;
const AFFIRMATIONS = ["\u800C\u662F", "\u5176\u5B9E\u662F", "\u662F", "\u53EA\u662F", "\u5374", "\u53CD\u800C", "\u5012", "\u800C"];
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const visibleLength = (text) => text.replace(/[\s“”"']/g, "").length;
const quotedRanges = (text) => {
  const ranges = [];
  const pattern = /[“"]([^”"]{0,400})[”"]/g;
  let match;
  while (match = pattern.exec(text)) ranges.push([match.index, match.index + match[0].length]);
  return ranges;
};
const insideRanges = (position, ranges) => ranges.some(([start, end]) => position >= start && position < end);
const maskQuoted = (text) => text.replace(/[“"][^”"]{0,400}[”"]/g, (match) => "\u3000".repeat(match.length));
const splitSentences = (text) => text.split(/(?<=[。！？!?])/).filter((item) => item.trim());
const compact = (text) => text.replace(/\s+/g, " ").trim().slice(0, 120);
const RULES = {
  "not-is-comparison": { severity: "blocking", review: "mechanical", layer: "expression", message: "\u9AD8\u9891 AI \u5BF9\u6BD4\u53E5\u5F0F\uFF1B\u5220\u6389\u5426\u5B9A\u94FA\u57AB\uFF0C\u76F4\u63A5\u5199\u540E\u9879\uFF0C\u6216\u6539\u6210\u52A8\u4F5C/\u7EC6\u8282\u5448\u73B0\u3002" },
  "voice-contrast": { severity: "blocking", review: "mechanical", layer: "expression", message: "\u97F3\u91CF\u53CD\u5DEE\u8154\uFF08\u300C\u58F0\u97F3\u4E0D\u9AD8\u2026\u2026\u5374\u2026\u2026\u300D\uFF09\uFF0C\u5B9E\u6218\u5E38\u89C1\u6F0F\u7F51\u53E5\u5F0F\uFF1B\u76F4\u63A5\u5199\u8BF4\u4E86\u4EC0\u4E48\u3001\u600E\u4E48\u8BF4\u7684\u3002" },
  "negation-parade": { severity: "blocking", review: "mechanical", layer: "expression", message: "\u5426\u5B9A\u6392\u6BD4\uFF08\u6CA1\u6709 X\uFF0C\u6CA1\u6709 Y\u2026\u2026\uFF09\uFF1B\u8FDE\u6392\u5426\u5B9A\u901A\u5E38\u53EF\u4EE5\u538B\u6210\u4E00\u53E5\u5177\u4F53\u63CF\u5199\u3002" },
  "reverse-not-is": { severity: "blocking", review: "mechanical", layer: "expression", message: "\u53CD\u5E8F\u5BF9\u6BD4\uFF08\u662F A\uFF0C\u4E0D\u662F B\uFF09\uFF1B\u4E0E\u300C\u4E0D\u662F A\uFF0C\u800C\u662F B\u300D\u540C\u6E90\uFF0C\u6539\u6210\u76F4\u63A5\u9648\u8FF0\u3002" },
  "trailer-ending": { severity: "blocking", review: "mechanical", layer: "narrative", message: "\u9884\u544A\u5F0F\u603B\u7ED3\u6536\u5C3E\uFF1B\u7ED3\u5C3E\u505C\u5728\u5177\u4F53\u52A8\u4F5C\u3001\u753B\u9762\u6216\u4E00\u53E5\u53F0\u8BCD\u4E0A\uFF0C\u522B\u66FF\u8BFB\u8005\u9884\u544A\u4E0B\u4E00\u7AE0\u3002" },
  "trailer-summary": { severity: "blocking", review: "mechanical", layer: "narrative", message: "\u7AE0\u5C3E\u72B6\u6001\u603B\u7ED3\u4F53\uFF1B\u7ED3\u5C3E\u8BBE\u5B9A\u8981\u843D\u6210\u6700\u540E\u4E00\u4E2A\u5177\u4F53\u52A8\u4F5C\u3001\u753B\u9762\u6216\u53F0\u8BCD\uFF0C\u522B\u66FF\u8BFB\u8005\u76D6\u7AE0\u3002" },
  "em-dash": { severity: "blocking", review: "mechanical", layer: "expression", message: "\u7834\u6298\u53F7\u6253\u65AD\uFF1B\u6309\u529F\u80FD\u6539\u5199\uFF08\u505C\u987F\u3001\u8865\u5145\u6216\u7701\u7565\uFF09\uFF0C\u4E0D\u8981\u7528\u7834\u6298\u53F7\u4EE3\u66FF\u53E5\u5B50\u3002" },
  "long-paragraph": { severity: "advisory", review: "mechanical", layer: "narrative", message: "\u6BB5\u843D\u8FC7\u957F\uFF1B\u624B\u673A\u9605\u8BFB\u6309\u955C\u5934\u65AD\u6BB5\u3002" },
  "period-stutter": { severity: "advisory", review: "mechanical", layer: "expression", message: "\u788E\u53E5\u53F7\uFF1A\u8FDE\u7EED\u591A\u4E2A\u6781\u77ED\u53D9\u8FF0\u53E5\uFF0C\u7F3A\u5C11\u547C\u5438\u3002" },
  "micro-action-tic": { severity: "advisory", review: "mechanical", layer: "narrative", message: "\u5FAE\u52A8\u4F5C\u590D\u8BFB\uFF08\u300C\u4E86\u4E0B / \u4E86\u4E00\u4E0B\u300D\u5F0F\u8F7B\u91CF\u8865\u8BED\u9AD8\u5BC6\u5EA6\uFF09\uFF0C\u6613\u6210\u7535\u62A5\u4F53\u6307\u7EB9\u3002" },
  "negation-pair-tic": { severity: "advisory", review: "semantic", layer: "expression", message: "\u5426\u5B9A\u5BF9\u5076\u590D\u8BFB\uFF08\u300C\u6CA1 A\uFF0C\u4E5F\u6CA1 B\u300D\uFF09\uFF1B\u4E00\u7AE0\u591A\u5904\u65F6\u8BFB\u8D77\u6765\u50CF\u82F1\u6587\u8282\u594F\u3002" },
  "cliche-density-tic": { severity: "advisory", review: "mechanical", layer: "expression", message: "\u5957\u8BCD\u5BC6\u5EA6\u504F\u9AD8\uFF08\u4EFF\u4F5B / \u4E00\u4E1D / \u6DF1\u5438\u4E00\u53E3\u6C14 / \u5FAE\u5FAE\u7B49\u805A\u96C6\uFF09\u3002" },
  "stock-reaction-tic": { severity: "advisory", review: "semantic", layer: "narrative", message: "\u5957\u5F0F\u53CD\u5E94\u7EC6\u8282\uFF08\u90E8\u4F4D\uFF0B\u8F7B\u5FAE\u52A8\u4F5C\u3001\u60C5\u7EEA\u5C3E\u5DF4\uFF09\u6210\u7247\u51FA\u73B0\uFF1B\u9010\u5904\u505A\u5220\u9664\u6D4B\u8BD5\u3002" },
  "action-list-tic": { severity: "advisory", review: "semantic", layer: "narrative", message: "\u76D1\u63A7\u6444\u50CF\u5934\u5F0F\u52A8\u4F5C\u6E05\u5355\uFF1A\u540C\u6BB5\u8FDE\u7EED\u6446\u653E\u52A8\u4F5C\u52A8\u8BCD\uFF0C\u7F3A\u5C11\u89C6\u89D2\u6E29\u5EA6\u3002" },
  "abstract-summary-tic": { severity: "advisory", review: "semantic", layer: "narrative", message: "\u62BD\u8C61\u603B\u7ED3\u590D\u8BFB\uFF08\u547D\u8FD0 / \u8FD9\u4E00\u5207 / \u624D\u521A\u521A\u5F00\u59CB\uFF09\uFF0CAI \u7ED3\u5C3E\u8154\u3002" },
  "metaphor-density-tic": { severity: "advisory", review: "semantic", layer: "expression", message: "\u6BD4\u55BB\u5BC6\u5EA6\u504F\u9AD8\uFF08\u50CF / \u597D\u50CF / \u4EFF\u4F5B / \u5982\u540C\u6210\u7247\u590D\u73B0\uFF09\u3002" },
  "reasoning-chain-tic": { severity: "advisory", review: "semantic", layer: "logic", message: "\u89E3\u91CA\u94FE\u5BC6\u5EA6\u504F\u9AD8\uFF08\u77E5\u9053 / \u660E\u767D / \u8FD9\u610F\u5473\u7740\u805A\u96C6\uFF09\uFF0C\u53D9\u8FF0\u8005\u66FF\u8BFB\u8005\u4E0B\u5224\u65AD\u3002" },
  "system-notice-formality-tic": { severity: "advisory", review: "semantic", layer: "expression", message: "\u7CFB\u7EDF\u516C\u544A\u516C\u6587\u8154\u8FC7\u5BC6\uFF08\u65B9\u62EC\u53F7\u3001\u89C4\u5219\u884C\u91CC\u786C\u89C4\u5219\u8BCD\u805A\u96C6\uFF09\u3002" },
  "overcompressed-prose-tic": { severity: "advisory", review: "semantic", layer: "narrative", message: "\u8FC7\u5EA6\u7CBE\u70BC\uFF1A\u77ED\u53D9\u8FF0\u6BB5\u8FC7\u5BC6\u4E14\u81EA\u7136\u8FDE\u63A5\u504F\u5C11\u3002" },
  "low-connective-density-tic": { severity: "advisory", review: "semantic", layer: "narrative", message: "\u4F4E\u8FDE\u63A5\u5BC6\u5EA6\uFF08\u5F15\u53F7\u5916\u8FDE\u63A5\u8BCD\u504F\u5C11\u3001\u4E2D\u957F\u53E5\u4E0D\u8DB3\uFF09\uFF0C\u50CF\u63D0\u7EB2\u6216\u7535\u62A5\u4F53\u3002" },
  "quote-emphasis-tic": { severity: "advisory", review: "semantic", layer: "expression", message: "\u53D9\u8FF0\u91CC\u7ED9 1\u20134 \u5B57\u77ED\u8BCD\u52A0\u5F15\u53F7\u5F3A\u8C03\uFF0C\u5BC6\u5EA6\u504F\u9AD8\u3002" },
  "formulaic-parallelism": { severity: "advisory", review: "semantic", layer: "expression", message: "\u5DE5\u6574\u5E76\u5217\uFF08\u300C\u4E0D V A\uFF0C\u4E0D V B\u300D\u5F0F\uFF09\uFF0C\u8BFB\u8D77\u6765\u50CF\u6A21\u677F\u3002" }
};
function scanProse(content) {
  const findings = [];
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const whole = lines.join("\n");
  const push = (type, line, column, excerpt) => {
    const rule = RULES[type];
    if (!rule) return;
    findings.push({ type, severity: rule.severity, review: rule.review, layer: rule.layer, line, column, excerpt: compact(excerpt), message: rule.message });
  };
  for (const [index, raw] of lines.entries()) {
    const lineNo = index + 1;
    if (!raw.trim()) continue;
    const text = raw;
    if (text.length > LONG_PARAGRAPH_CHARS) push("long-paragraph", lineNo, 1, text);
    for (const pattern of [/—{2}|——/, /——/]) {
      const match = pattern.exec(text);
      if (match) {
        push("em-dash", lineNo, match.index + 1, text.slice(match.index, match.index + 16));
        break;
      }
    }
    for (const [type, pattern] of [["voice-contrast", VOICE_CONTRAST], ["reverse-not-is", REVERSE_NOT_IS], ["negation-parade", NEGATION_PARADE], ["trailer-ending", TRAILER_ENDING], ["trailer-summary", TRAILER_SUMMARY]]) {
      const match = pattern.exec(text);
      if (match) push(type, lineNo, match.index + 1, text.slice(match.index));
    }
    const masked = maskQuoted(text), ranges = quotedRanges(text);
    for (const sentence of splitSentences(text)) {
      const at = text.indexOf(sentence);
      if (at < 0 || insideRanges(at, ranges)) continue;
      const negative = NEGATIVE_SETUP.exec(sentence);
      if (!negative) continue;
      const tail = sentence.slice(negative.index + negative[0].length);
      const flip = /^而是/.test(tail) || /^(?:是|却|但|只是|反而)/.test(tail) && /却|但|反而|而是/.test(sentence);
      if (flip && tail.length <= MAX_POSITIVE_SPAN) push("not-is-comparison", lineNo, at + negative.index + 1, sentence);
    }
    const parallelism = FORMULAIC_PARALLEL.exec(masked);
    if (parallelism) push("formulaic-parallelism", lineNo, parallelism.index + 1, text.slice(parallelism.index, parallelism.index + 24));
  }
  const paragraphs = {};
  let current = [];
  const flush = () => {
    if (current.length) paragraphs[current[0].line] = current.map((item) => item.text).join("");
    current = [];
  };
  for (const [index, raw] of lines.entries()) {
    if (!raw.trim()) {
      flush();
      continue;
    }
    current.push({ line: index + 1, text: raw });
  }
  flush();
  const chapterText = lines.join("").replace(/\s/g, "");
  const kilo = Math.max(chapterText.length, 1) / 1e3;
  const count = (text, terms) => terms.reduce((sum, term) => sum + text.split(term).length - 1, 0);
  for (const [start, text] of Object.entries(paragraphs).map(([key, value]) => [Number(key), value])) {
    const narration = maskQuoted(text);
    const micro = (narration.match(MICRO_TIC_PATTERN) || []).length;
    if (micro >= MICRO_TIC_MIN_HITS && micro / kilo >= MICRO_TIC_PER_KILO) push("micro-action-tic", start, 1, text);
    if ((narration.match(NEGATION_PAIR_PATTERN) || []).length >= NEGATION_PAIR_MIN_HITS) push("negation-pair-tic", start, 1, text);
    const stock = STOCK_REACTION_PATTERNS.reduce((sum, pattern) => sum + (narration.match(pattern) || []).length, 0);
    if (stock >= STOCK_REACTION_MIN_HITS) push("stock-reaction-tic", start, 1, text);
    const actions = ACTION_VERBS.reduce((sum, verb) => sum + narration.split(verb).length - 1, 0);
    if (actions >= ACTION_LIST_MIN_HITS && !/[一-龥]的[一-龥]/.test(narration)) push("action-list-tic", start, 1, text);
    const sentences = splitSentences(narration).filter((sentence) => sentence.trim());
    let run = 0, worst = 0;
    for (const sentence of sentences) {
      if (visibleLength(sentence) <= STUTTER_MAX_SENTENCE) run++;
      else {
        worst = Math.max(worst, run);
        run = 0;
      }
    }
    if (Math.max(worst, run) >= STUTTER_MIN_RUN) push("period-stutter", start, 1, text);
  }
  const global = (type, hits, threshold, sample, scope = 1) => {
    if (hits >= threshold) push(type, scope, 1, sample);
  };
  const allNarration = maskQuoted(whole);
  global("cliche-density-tic", count(allNarration, CLICHE_TERMS), Math.max(2, Math.ceil(CLICHE_PER_KILO * kilo)), CLICHE_TERMS.join(" / "));
  global("metaphor-density-tic", count(allNarration, METAPHOR_MARKERS), Math.max(2, Math.ceil(METAPHOR_PER_KILO * kilo)), METAPHOR_MARKERS.join(" / "));
  global("reasoning-chain-tic", count(allNarration, REASONING_TERMS), Math.max(2, Math.ceil(REASONING_PER_KILO * kilo)), REASONING_TERMS.join(" / "));
  global("system-notice-formality-tic", count(whole, NOTICE_TERMS), NOTICE_MIN_HITS, NOTICE_TERMS.join(" / "));
  global("abstract-summary-tic", count(allNarration, ABSTRACT_SUMMARY_TERMS), ABSTRACT_MIN_HITS, ABSTRACT_SUMMARY_TERMS.join(" / "));
  global("quote-emphasis-tic", (allNarration.match(QUOTE_EMPHASIS) || []).length, QUOTE_EMPHASIS_MIN_HITS, "\u5F15\u53F7\u77ED\u8BCD");
  const connectives = count(allNarration, CONNECTIVES);
  if (chapterText.length > 400 && connectives / kilo < 3) push("low-connective-density-tic", 1, 1, "\u8FDE\u63A5\u8BCD\u5BC6\u5EA6\u504F\u4F4E");
  const shortParagraphs = Object.values(paragraphs).filter((text) => visibleLength(maskQuoted(text)) <= 30).length;
  const totalParagraphs = Object.keys(paragraphs).length;
  if (totalParagraphs >= 8 && shortParagraphs / totalParagraphs > 0.7) push("overcompressed-prose-tic", 1, 1, "\u77ED\u53D9\u8FF0\u6BB5\u8FC7\u5BC6");
  return findings;
}
function summarize(content, findings) {
  const totalChars = String(content || "").replace(/\s/g, "").length;
  const byType = /* @__PURE__ */ new Map();
  for (const finding of findings) {
    const entry = byType.get(finding.type) || { type: finding.type, severity: finding.severity, review: finding.review, count: 0, blockingCount: 0 };
    entry.count++;
    if (finding.severity === "blocking") entry.blockingCount++;
    byType.set(finding.type, entry);
  }
  const counts = [...byType.values()].sort((a, b) => (b.severity === "blocking") - (a.severity === "blocking") || b.count - a.count || a.type.localeCompare(b.type));
  const blocking = counts.reduce((sum, item) => sum + item.blockingCount, 0);
  const advisory = counts.reduce((sum, item) => sum + item.count - item.blockingCount, 0);
  return {
    findings,
    counts,
    totalChars,
    perThousand: totalChars ? Math.round(findings.length / totalChars * 1e4) / 10 : 0,
    blocking,
    advisory,
    clean: findings.length === 0
  };
}
const RULE_TABLE = RULES;
const RULE_TYPES = Object.keys(RULES);
export {
  RULE_TABLE,
  RULE_TYPES,
  scanProse,
  summarize
};
