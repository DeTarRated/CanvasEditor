import { wrapText } from "../src/text/line-break";
import type { TextMatrixItem } from "../src/text/types";

const itemsFor = (text: string): TextMatrixItem[] =>
  Array.from(text, char => ({
    char,
    font: "",
    config: {},
    width: 1,
    height: 1,
    ascent: 1,
    descent: 0,
  }));

const lineText = (lines: TextMatrixItem[][]) =>
  lines.map(line => line.map(item => item.char).join(""));

describe("wrapText", () => {
  it("moves a styled English word to the next line when the remaining width is too small", () => {
    const items = itemsFor("使用React");
    items[3].config.WEIGHT = "bold";
    items[3].width = 2;

    const lines = wrapText(items, 6);

    expect(lineText(lines)).toEqual(["使用", "React"]);
    expect(lines[1][1]).toBe(items[3]);
  });

  it.each([
    ["用pre-built", 9, ["用", "pre-built"]],
    ["say don't", 5, ["say", "don't"]],
    ["说明OpenAI，续写", 7, ["说明", "OpenAI，", "续写"]],
    ["结尾！？继续", 3, ["结", "尾！？", "继续"]],
    ["字 ，下", 3, ["字 ，", "下"]],
    ['"ok" next', 3, ['"o', 'k"', "nex", "t"]],
    ["abcdefgh,", 4, ["abcd", "efg", "h,"]],
    ["字。下", 1, ["字。", "下"]],
    ["", 0, [""]],
  ])("wraps %s at width %d", (text, width, expected) => {
    expect(lineText(wrapText(itemsFor(text), width))).toEqual(expected);
  });
});
