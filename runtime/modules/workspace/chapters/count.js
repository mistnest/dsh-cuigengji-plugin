function countManuscript(content) {
  return Array.from(content.replace(/\s/gu, "")).length;
}
export {
  countManuscript
};
