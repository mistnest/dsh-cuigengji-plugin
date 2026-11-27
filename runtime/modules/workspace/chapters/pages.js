async function readFullChapter(readPage) {
  const maxChars = 2e5;
  const first = await readPage({ maxChars });
  let page = first;
  const parts = [first.content];
  while (page.nextStart !== null) {
    page = await readPage({ start: page.nextStart, maxChars, expectedRevision: first.revision });
    if (page.revision !== first.revision) {
      throw Object.assign(new Error("\u8BFB\u53D6\u671F\u95F4\u6B63\u6587\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BD5\u3002"), { code: "CONFLICT" });
    }
    parts.push(page.content);
  }
  const content = parts.join("");
  return { ...first, content, end: content.length, nextStart: null };
}
export {
  readFullChapter
};
