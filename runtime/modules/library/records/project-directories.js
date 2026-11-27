const invalid = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
const reserved = /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i;
const directoryKey = (name) => name.normalize("NFC").toLowerCase();
function shorten(name, suffix = "") {
  let shortened = "";
  for (const character of name) {
    if (shortened.length + character.length + suffix.length > 64) break;
    shortened += character;
  }
  return (shortened.replace(/[ .]+$/g, "") || "\u672A\u547D\u540D\u4F5C\u54C1") + suffix;
}
function projectDirectoryName(title) {
  let name = title.normalize("NFC").replace(invalid, "_").trim().replace(/[ .]+$/g, "");
  if (!name) name = "\u672A\u547D\u540D\u4F5C\u54C1";
  if (reserved.test(name)) name = "\u4F5C\u54C1_" + name;
  return shorten(name);
}
function validProjectDirectory(name) {
  return typeof name === "string" && !!name && name.length <= 120 && name !== "." && name !== ".." && !/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(name) && !/[ .]$/.test(name) && !reserved.test(name);
}
function planProjectDirectories(books, previous = {}, previousBooks = {}, occupied = []) {
  const used = new Set([...Object.values(previous), ...occupied].map(directoryKey));
  const directories = {}, moves = [];
  for (const [id, book] of Object.entries(books)) {
    if (typeof book.title !== "string") throw Object.assign(new Error("\u4F5C\u54C1\u4E66\u540D\u65E0\u6548\uFF0C\u65E0\u6CD5\u5EFA\u7ACB\u76EE\u5F55\u6620\u5C04"), { code: "CORRUPT_STORE" });
    const current = previous[id], name = projectDirectoryName(book.title);
    if (current && (previousBooks[id]?.title === book.title || directoryKey(current) === directoryKey(name) || typeof previousBooks[id]?.title === "string" && projectDirectoryName(previousBooks[id].title) === name)) {
      directories[id] = current;
      continue;
    }
    let destination = name, number = 2;
    while (used.has(directoryKey(destination))) destination = shorten(name, `\uFF08${number++}\uFF09`);
    used.add(directoryKey(destination));
    directories[id] = destination;
    if (current) moves.push({ from: `novels/${current}`, to: `novels/${destination}`, novelId: id });
  }
  return { directories, moves };
}
export {
  directoryKey,
  planProjectDirectories,
  projectDirectoryName,
  validProjectDirectory
};
