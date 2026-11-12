const priceCalendarYear = 2026;
const holidays = new Set("2026-01-01 2026-01-02 2026-01-03 2026-02-15 2026-02-16 2026-02-17 2026-02-18 2026-02-19 2026-02-20 2026-02-21 2026-02-22 2026-02-23 2026-04-04 2026-04-05 2026-04-06 2026-05-01 2026-05-02 2026-05-03 2026-05-04 2026-05-05 2026-06-19 2026-06-20 2026-06-21 2026-09-25 2026-09-26 2026-09-27 2026-10-01 2026-10-02 2026-10-03 2026-10-04 2026-10-05 2026-10-06 2026-10-07".split(" "));
const defaultPriceSchedule = () => ({ utcOffsetMinutes: 480, weekdays: [1, 2, 3, 4, 5], excludeChinaHolidays: true, windows: [{ start: "09:00", end: "12:00" }, { start: "14:00", end: "18:00" }] });
const validTime = (time) => typeof time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const minute = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
function priceScheduleIssue(s) {
  if (!s || !Number.isInteger(s.utcOffsetMinutes) || s.utcOffsetMinutes < -720 || s.utcOffsetMinutes > 840 || typeof s.excludeChinaHolidays !== "boolean") return "\u8BF7\u9009\u62E9\u6709\u6548\u7684\u8BA1\u4EF7\u65F6\u533A\u3002";
  if (!Array.isArray(s.weekdays) || !s.weekdays.length || s.weekdays.length > 7 || s.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6) || new Set(s.weekdays).size !== s.weekdays.length) return "\u8BF7\u81F3\u5C11\u9009\u62E9\u4E00\u4E2A\u5CF0\u4EF7\u9002\u7528\u65E5\u3002";
  if (!Array.isArray(s.windows) || !s.windows.length || s.windows.length > 6) return "\u8BF7\u8BBE\u7F6E\u4E00\u81F3\u516D\u4E2A\u5CF0\u4EF7\u65F6\u6BB5\u3002";
  if (s.windows.some((w) => !w || !validTime(w.start) || !validTime(w.end) || w.start === w.end)) return "\u8BF7\u586B\u5199\u4E0D\u540C\u7684\u5F00\u59CB\u3001\u7ED3\u675F\u65F6\u95F4\u3002";
  const slots = /* @__PURE__ */ new Set();
  for (const day of s.weekdays) for (const window of s.windows) {
    const start = minute(window.start), end = minute(window.end);
    for (let m = start; m < (end > start ? end : end + 1440); m++) {
      const slot = (day * 1440 + m) % 10080;
      if (slots.has(slot)) return "\u5CF0\u4EF7\u65F6\u6BB5\u6709\u91CD\u53E0\uFF0C\u8BF7\u8C03\u6574\u540E\u4FDD\u5B58\u3002";
      slots.add(slot);
    }
  }
  return "";
}
function peakPrice(time, schedule = defaultPriceSchedule()) {
  const d = new Date(time + schedule.utcOffsetMinutes * 6e4), date = d.toISOString().slice(0, 10), day = d.getUTCDay(), now = d.getUTCHours() * 60 + d.getUTCMinutes();
  if (schedule.excludeChinaHolidays && holidays.has(date)) return false;
  const previous = new Date(d.getTime() - 864e5), previousAllowed = schedule.weekdays.includes(previous.getUTCDay()) && (!schedule.excludeChinaHolidays || !holidays.has(previous.toISOString().slice(0, 10)));
  return schedule.windows.some((w) => {
    const start = minute(w.start), end = minute(w.end);
    return start < end ? schedule.weekdays.includes(day) && now >= start && now < end : schedule.weekdays.includes(day) && now >= start || previousAllowed && now < end;
  });
}
function peakStatus(time = Date.now()) {
  const peak = peakPrice(time), date = new Date(time + 8 * 36e5);
  let next = null;
  for (let day = 0; day <= 12 && next === null; day++) for (const hour of [0, 9, 12, 14, 18]) {
    const candidate = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + day, hour - 8);
    if (candidate > time && peakPrice(candidate) !== peak) {
      next = candidate;
      break;
    }
  }
  const minutes = next === null ? 0 : Math.max(0, Math.ceil((next - time) / 6e4));
  return { peak, label: peak ? "\u9AD8\u5CF0\u65F6\u6BB5" : "\u7A7A\u95F2\u65F6\u6BB5", nextChangeAt: next, countdown: next === null ? "\u5F85\u66F4\u65B0\u65E5\u5386" : `${Math.floor(minutes / 60)}\u5C0F\u65F6${minutes % 60}\u5206\u540E${peak ? "\u8F6C\u7A7A\u95F2" : "\u8F6C\u9AD8\u5CF0"}`, calendarNote: date.getUTCFullYear() === priceCalendarYear ? "" : "\u8282\u5047\u65E5\u89C4\u5219\u5F85\u66F4\u65B0\uFF0C\u6309\u5DE5\u4F5C\u65E5\u4F30\u7B97" };
}
export {
  defaultPriceSchedule,
  peakPrice,
  peakStatus,
  priceCalendarYear,
  priceScheduleIssue
};
