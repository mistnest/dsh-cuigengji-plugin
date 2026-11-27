/** Merge only editor-owned fields; layout and server metadata always come from remote. */
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

interface Hunk {
  start: number;
  end: number;
  nextStart: number;
  nextEnd: number;
  items: string[];
}

const sameItems = (a: string[], b: string[]) => a.length === b.length && a.every((v, i) => v === b[i]);

function appendRange(out: string[], src: string[], start: number, end: number) {
  for (let k = start; k < end; k++) out.push(src[k]);
}

function appendAll(out: string[], src: string[]) {
  for (let k = 0; k < src.length; k++) out.push(src[k]);
}

function diffHunks(base: string[], next: string[]): Hunk[] {
  const N = base.length, M = next.length;
  let pre = 0;
  while (pre < N && pre < M && base[pre] === next[pre]) pre++;
  let suf = 0;
  while (suf < N - pre && suf < M - pre && base[N - 1 - suf] === next[M - 1 - suf]) suf++;
  const n = N - pre - suf, m = M - pre - suf;
  if (n === 0 && m === 0) return [];
  const a = base.slice(pre, pre + n), b = next.slice(pre, pre + m);
  if (n === 0 || m === 0 || n + m > 400000) {
    return [{start: pre, end: pre + n, nextStart: pre, nextEnd: pre + m, items: b}];
  }

  const maxD = Math.min(n + m, 384);
  const offset = maxD + 2;
  const v = new Int32Array(2 * offset + 1).fill(-1);
  v[offset + 1] = 0;
  // Store only the active [-d..d] band (O(D^2) memory instead of O((N+M)*D)).
  const trace: Int32Array[] = [];
  let foundD = -1;

  for (let d = 0; d <= maxD; d++) {
    for (let k = -d; k <= d; k += 2) {
      const down = k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1]);
      let x = down ? v[offset + k + 1] : v[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[offset + k] = x;
      if (x >= n && y >= m) { foundD = d; break; }
    }
    trace.push(v.slice(offset - d - 1, offset + d + 2));
    if (foundD >= 0) break;
  }

  if (foundD < 0) {
    return [{start: pre, end: pre + n, nextStart: pre, nextEnd: pre + m, items: b}];
  }

  const rawOps: {aStart: number; aEnd: number; bStart: number; bEnd: number}[] = [];
  let x = n, y = m;
  for (let d = foundD; d > 0; d--) {
    const prevBand = trace[d - 1];
    const bandOffset = d; // prevBand covers [-(d-1)-1 .. (d-1)+1] = [-d .. d]
    const k = x - y;
    const down = k === -d || (k !== d && prevBand[bandOffset + k - 1] < prevBand[bandOffset + k + 1]);
    const prevK = down ? k + 1 : k - 1;
    const prevX = prevBand[bandOffset + prevK];
    const prevY = prevX - prevK;
    if (down) rawOps.push({aStart: prevX, aEnd: prevX, bStart: prevY, bEnd: prevY + 1});
    else rawOps.push({aStart: prevX, aEnd: prevX + 1, bStart: prevY, bEnd: prevY});
    x = prevX;
    y = prevY;
  }
  rawOps.reverse();

  const hunks: Hunk[] = [];
  for (const op of rawOps) {
    const s = pre + op.aStart, e = pre + op.aEnd;
    const ns = pre + op.bStart, ne = pre + op.bEnd;
    const last = hunks.at(-1);
    if (last && last.end >= s) {
      last.end = e;
      last.nextEnd = ne;
      last.items = next.slice(last.nextStart, last.nextEnd);
    } else {
      hunks.push({start: s, end: e, nextStart: ns, nextEnd: ne, items: next.slice(ns, ne)});
    }
  }
  return hunks;
}

function mergeCodepoints(base: string, local: string, remote: string): string | null {
  if (local === remote || remote === base) return local;
  if (local === base) return remote;
  const baseArr = Array.from(base), localArr = Array.from(local), remoteArr = Array.from(remote);
  const aHunks = diffHunks(baseArr, localArr), bHunks = diffHunks(baseArr, remoteArr);
  const out: string[] = [];
  let i = 0, j = 0, cursor = 0;

  while (i < aHunks.length || j < bHunks.length) {
    if (j >= bHunks.length) {
      const a = aHunks[i++];
      appendRange(out, baseArr, cursor, a.start);
      appendAll(out, a.items);
      cursor = a.end;
    } else if (i >= aHunks.length) {
      const b = bHunks[j++];
      appendRange(out, baseArr, cursor, b.start);
      appendAll(out, b.items);
      cursor = b.end;
    } else {
      const a = aHunks[i], b = bHunks[j];
      if (a.end < b.start || (a.end === b.start && !(a.start === a.end && b.start === b.end))) {
        appendRange(out, baseArr, cursor, a.start);
        appendAll(out, a.items);
        cursor = a.end;
        i++;
      } else if (b.end < a.start || (b.end === a.start && !(b.start === b.end && a.start === a.end))) {
        appendRange(out, baseArr, cursor, b.start);
        appendAll(out, b.items);
        cursor = b.end;
        j++;
      } else if (a.start === b.start && a.end === b.end && sameItems(a.items, b.items)) {
        appendRange(out, baseArr, cursor, a.start);
        appendAll(out, a.items);
        cursor = a.end;
        i++;
        j++;
      } else {
        return null;
      }
    }
  }
  appendRange(out, baseArr, cursor, baseArr.length);
  return out.join('');
}

export function mergeText(base: string, local: string, remote: string): string | null {
  if (local === remote || remote === base) return local;
  if (local === base) return remote;
  if (!base.includes('\n') && !local.includes('\n') && !remote.includes('\n')) {
    return mergeCodepoints(base, local, remote);
  }

  const baseLines = base.split('\n'), localLines = local.split('\n'), remoteLines = remote.split('\n');
  const aHunks = diffHunks(baseLines, localLines), bHunks = diffHunks(baseLines, remoteLines);
  const out: string[] = [];
  let i = 0, j = 0, cursor = 0;

  const deltaAt = (hunks: Hunk[], uptoIndex: number) => {
    let delta = 0;
    for (let k = 0; k < uptoIndex; k++) delta += (hunks[k].nextEnd - hunks[k].nextStart) - (hunks[k].end - hunks[k].start);
    return delta;
  };

  while (i < aHunks.length || j < bHunks.length) {
    if (j >= bHunks.length) {
      const a = aHunks[i++];
      appendRange(out, baseLines, cursor, a.start);
      appendAll(out, a.items);
      cursor = a.end;
    } else if (i >= aHunks.length) {
      const b = bHunks[j++];
      appendRange(out, baseLines, cursor, b.start);
      appendAll(out, b.items);
      cursor = b.end;
    } else {
      const a = aHunks[i], b = bHunks[j];
      if (a.end < b.start || (a.end === b.start && !(a.start === a.end && b.start === b.end))) {
        appendRange(out, baseLines, cursor, a.start);
        appendAll(out, a.items);
        cursor = a.end;
        i++;
      } else if (b.end < a.start || (b.end === a.start && !(b.start === b.end && a.start === a.end))) {
        appendRange(out, baseLines, cursor, b.start);
        appendAll(out, b.items);
        cursor = b.end;
        j++;
      } else if (a.start === b.start && a.end === b.end && sameItems(a.items, b.items)) {
        appendRange(out, baseLines, cursor, a.start);
        appendAll(out, a.items);
        cursor = a.end;
        i++;
        j++;
      } else {
        const startI = i, startJ = j;
        const baseStart = Math.min(a.start, b.start);
        let baseEnd = Math.max(a.end, b.end);
        i++;
        j++;
        let grew = true;
        while (grew) {
          grew = false;
          while (i < aHunks.length && aHunks[i].start <= baseEnd) {
            baseEnd = Math.max(baseEnd, aHunks[i].end);
            i++;
            grew = true;
          }
          while (j < bHunks.length && bHunks[j].start <= baseEnd) {
            baseEnd = Math.max(baseEnd, bHunks[j].end);
            j++;
            grew = true;
          }
        }
        const localStart = baseStart + deltaAt(aHunks, startI);
        const localEnd = baseEnd + deltaAt(aHunks, i);
        const remoteStart = baseStart + deltaAt(bHunks, startJ);
        const remoteEnd = baseEnd + deltaAt(bHunks, j);
        if (baseStart === baseEnd || localStart === localEnd || remoteStart === remoteEnd) return null;
        const subMerged = mergeCodepoints(
          baseLines.slice(baseStart, baseEnd).join('\n'),
          localLines.slice(localStart, localEnd).join('\n'),
          remoteLines.slice(remoteStart, remoteEnd).join('\n'),
        );
        if (subMerged === null) return null;
        appendRange(out, baseLines, cursor, baseStart);
        appendAll(out, subMerged.split('\n'));
        cursor = baseEnd;
      }
    }
  }
  appendRange(out, baseLines, cursor, baseLines.length);
  return out.join('\n');
}

export function mergeDocument<T extends Record<string, any>>(base: T, local: T, remote: T, fields: readonly string[]) {
  const value = {...remote}, conflicts: string[] = [];
  for (const key of fields) {
    if (same(local[key], base[key])) continue;
    if (same(remote[key], base[key]) || same(remote[key], local[key])) { value[key as keyof T] = local[key]; continue; }
    const merged = typeof base[key] === 'string' && typeof local[key] === 'string' && typeof remote[key] === 'string'
      ? mergeText(base[key], local[key], remote[key])
      : null;
    if (merged !== null) value[key as keyof T] = merged as T[keyof T];
    else { conflicts.push(key); value[key as keyof T] = local[key]; }
  }
  const patch = Object.fromEntries(fields.filter(key => !same(value[key], remote[key])).map(key => [key, value[key]]));
  return {value, patch, conflicts};
}
