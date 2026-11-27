export type TextSelection = {start: number; end: number; direction: 'forward' | 'backward' | 'none'};

/** Keep the caret attached to its text when a remote edit changes preceding prose. */
export function mapSelection(before: string, after: string, selection: TextSelection): TextSelection {
  let start = 0, oldEnd = before.length, newEnd = after.length;
  while (start < oldEnd && start < newEnd && before[start] === after[start]) start++;
  while (oldEnd > start && newEnd > start && before[oldEnd - 1] === after[newEnd - 1]) {oldEnd--; newEnd--;}
  const move = (position: number) => {
    if (position < start) return position;
    if (position >= oldEnd) return position + newEnd - oldEnd;
    return start + Math.min(position - start, newEnd - start);
  };
  const clamp = (position: number) => Math.max(0, Math.min(after.length, move(position)));
  return {start: clamp(selection.start), end: clamp(selection.end), direction: selection.direction};
}
