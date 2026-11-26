import type { TextMatrixItem } from "./types";

const WORD_CHARACTER = /[\p{Script=Latin}\p{Nd}\p{M}]/u;
const WORD_JOINER = /['’\-‐‑]/u;
const BREAK_SPACE = /[ \t\u3000]/u;
const NO_LINE_START = /[\p{Pe}\p{Pf}\p{M},.!?;:%‰‱…。，、！？；：％．｡､]/u;
const NO_LINE_END = /[\p{Ps}\p{Pi}]/u;
const STRAIGHT_QUOTE = /["']/u;

const isInsideWord = (items: TextMatrixItem[], index: number) => {
  const left = items[index - 1].char;
  const right = items[index].char;
  return (
    WORD_CHARACTER.test(right) &&
    (WORD_CHARACTER.test(left) ||
      (WORD_JOINER.test(left) && WORD_CHARACTER.test(items[index - 2]?.char ?? "")))
  );
};

const findLineEnd = (items: TextMatrixItem[], start: number, availableWidth: number) => {
  let width = 0;
  let wordBreak = start;
  let characterBreak = start;
  for (let end = start; end < items.length; end++) {
    const previousChar = items[end - 1]?.char ?? "";
    if (end > start && !BREAK_SPACE.test(previousChar)) {
      // Treat a run of spaces as part of the break so punctuation cannot follow it onto a new line.
      let next = end;
      while (next < items.length && BREAK_SPACE.test(items[next].char)) next++;
      const nextChar = items[next]?.char ?? "";
      const beforePrevious = items[end - 2]?.char ?? "";
      const openingQuote =
        STRAIGHT_QUOTE.test(previousChar) &&
        (end === start + 1 || BREAK_SPACE.test(beforePrevious) || NO_LINE_END.test(beforePrevious));
      const closingQuote =
        next === end &&
        STRAIGHT_QUOTE.test(nextChar) &&
        !WORD_CHARACTER.test(items[next + 1]?.char ?? "");
      const attachedJoiner =
        next === end && WORD_JOINER.test(nextChar) && WORD_CHARACTER.test(previousChar);
      if (
        !NO_LINE_END.test(previousChar) &&
        !NO_LINE_START.test(nextChar) &&
        !openingQuote &&
        !closingQuote &&
        !attachedJoiner
      ) {
        // A glyph and its trailing punctuation may be wider than the entire text box.
        if (width > availableWidth) return end;
        characterBreak = end;
        if (!isInsideWord(items, end)) wordBreak = end;
      }
    }
    width += items[end].width;
    if (width > availableWidth && characterBreak > start) {
      return wordBreak > start ? wordBreak : characterBreak;
    }
  }
  return items.length;
};

export const wrapText = (items: TextMatrixItem[], availableWidth: number) => {
  if (!items.length) return [items];
  const lines: TextMatrixItem[][] = [];
  let start = 0;
  while (start < items.length) {
    const end = findLineEnd(items, start, availableWidth);
    lines.push(items.slice(start, end));
    start = end;
    while (start < items.length && BREAK_SPACE.test(items[start].char)) start++;
  }
  return lines;
};
