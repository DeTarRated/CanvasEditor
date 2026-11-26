import { TEXT_1 } from "sketching-utils";

import { TRULY } from "../utils/constant";
import { DEFAULT, DIVIDING_LINE_OFFSET, TEXT_ATTRS } from "./constant";
import {
  drawingBackground,
  drawingDividingLine,
  drawingList,
  drawingStrikeThrough,
  drawingUnderline,
  getLineOffset,
} from "./drawing";
import { wrapText } from "./line-break";
import type { Attributes, RichTextLines, TextMatrices, TextMatrix, TextMatrixItem } from "./types";

export class RichText {
  private ctx: CanvasRenderingContext2D;
  private map: Map<string, TextMetrics>;
  constructor() {
    this.map = new Map();
    const canvas = document.createElement("canvas");
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  }

  private getFont = (config: Attributes) => {
    const fontFamily = config[TEXT_ATTRS.FAMILY] || DEFAULT[TEXT_ATTRS.FAMILY];
    const fontSize = config[TEXT_ATTRS.SIZE] || DEFAULT[TEXT_ATTRS.SIZE];
    const fontWeight = config[TEXT_ATTRS.WEIGHT] || DEFAULT[TEXT_ATTRS.WEIGHT];
    const fontStyle = config[TEXT_ATTRS.STYLE] || DEFAULT[TEXT_ATTRS.STYLE];
    return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
  };

  public measure = (text: string, config: Attributes) => {
    const font = this.getFont(config);
    this.ctx.font = font;
    const key = `${font}-${text}`;
    if (this.map.has(key)) {
      return { metric: this.map.get(key), font };
    }
    const metric = this.ctx.measureText(text);
    this.map.set(key, metric);
    return { metric, font };
  };

  public parse = (lines: RichTextLines, width: number) => {
    const group: TextMatrices = [];
    for (const line of lines) {
      const lineHeight = Number(
        line.config[TEXT_ATTRS.LINE_HEIGHT] || DEFAULT[TEXT_ATTRS.LINE_HEIGHT]
      );
      const lineOffset = getLineOffset(line);
      const items: TextMatrixItem[] = [];
      for (const fragment of line.chars) {
        for (const char of fragment.char) {
          const { metric, font } = this.measure(char, fragment.config);
          if (!metric) continue;
          const {
            width,
            actualBoundingBoxAscent: ascent,
            actualBoundingBoxDescent: descent,
          } = metric;
          items.push({
            char,
            font,
            config: { ...fragment.config },
            width,
            height: ascent + descent,
            ascent,
            descent,
          });
        }
      }
      const rows = wrapText(items, width - lineOffset);
      for (const [index, row] of rows.entries()) {
        const matrix: TextMatrix = {
          items: row,
          // COMPAT: 高度给予最小值
          originHeight: DEFAULT[TEXT_ATTRS.SIZE],
          height: DEFAULT[TEXT_ATTRS.SIZE] * lineHeight,
          width: 0,
          lineHeight,
          offsetX: lineOffset,
          config: { ...line.config },
          ascent: 0,
          descent: 0,
        };
        for (const item of row) {
          matrix.originHeight = Math.max(matrix.originHeight, item.height);
          matrix.height = Math.max(matrix.height, item.height * lineHeight);
          matrix.width += item.width;
          matrix.ascent = Math.max(matrix.ascent, item.ascent);
          matrix.descent = Math.max(matrix.descent, item.descent);
        }
        if (index > 0) matrix.config[TEXT_ATTRS.BREAK_LINE_START] = TRULY;
        if (index === rows.length - 1) matrix.break = true;
        group.push(matrix);
      }
    }
    return group;
  };

  public render = (
    matrices: TextMatrices,
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, width, height);
    this.ctx.clip();
    ctx.textBaseline = "bottom";
    let offsetX = x;
    let offsetY = y;
    for (const matrix of matrices) {
      const offsetYBaseLine = offsetY + matrix.height;
      if (offsetYBaseLine > y + height) break;
      if (drawingDividingLine(ctx, matrix, width, offsetX, offsetY)) {
        offsetX = x;
        offsetY = offsetY + DIVIDING_LINE_OFFSET;
        continue;
      }
      const middleOffsetY = offsetYBaseLine - matrix.originHeight / 2;
      drawingList(ctx, matrix.config, offsetX, middleOffsetY, offsetYBaseLine);
      offsetX = offsetX + matrix.offsetX;
      const gap = matrix.break
        ? 0
        : Math.max(0, (width - matrix.width - matrix.offsetX) / matrix.items.length);
      const halfGap = gap / 2;
      for (let i = 0; i < matrix.items.length; ++i) {
        const item = matrix.items[i];
        // Debug Text Render
        // drawingDebugLine(ctx, matrix, item, halfGap, offsetX, offsetY, offsetYBaseLine);
        // 连续绘制背景
        drawingBackground(ctx, matrix, item, i, halfGap, offsetX, offsetYBaseLine);
        // 绘制文字
        ctx.font = item.font;
        ctx.fillStyle = item.config[TEXT_ATTRS.COLOR] || TEXT_1;
        ctx.fillText(item.char, offsetX, offsetYBaseLine);
        // 绘制下划线
        drawingUnderline(ctx, matrix, item, halfGap, offsetX, offsetYBaseLine);
        // 绘制中划线
        drawingStrikeThrough(ctx, item, halfGap, offsetX, middleOffsetY);
        offsetX = offsetX + item.width + gap;
      }
      offsetX = x;
      offsetY = offsetYBaseLine;
    }
    this.ctx.closePath();
    this.ctx.restore();
  };
}
