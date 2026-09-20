/**
 * Casio fx-83GT X ClassWiz Interactive State Controller
 *
 * Encapsulates the entire state machine for button clicks, Natural-V.P.A.M.
 * block transitions (fractions, radicals, powers, absolute values),
 * Replay rocker navigation, and expression evaluation.
 *
 * Used both by the UI component (<CasioCalculatorModal />) and automated tests.
 */

import {
  evaluateExpression,
  toFraction,
  toPiFraction,
  formatPiResult,
  serializeToMath,
  serializeToText,
  ExprItem,
} from "./casio-math-engine";

export type CursorTarget =
  | { location: "main"; index?: number }
  | { location: "sqrt"; itemId: string }
  | { location: "frac-num"; itemId: string }
  | { location: "frac-den"; itemId: string }
  | { location: "mixed-whole"; itemId: string }
  | { location: "mixed-num"; itemId: string }
  | { location: "mixed-den"; itemId: string }
  | { location: "pow-base"; itemId: string }
  | { location: "pow"; itemId: string }
  | { location: "log-base"; itemId: string }
  | { location: "log-arg"; itemId: string }
  | { location: "abs"; itemId: string };

export interface HistoryEntry {
  items: ExprItem[];
  res: string;
  num: number | null;
}

// Deletes entire multi-letter function names in one keystroke (e.g. sin(, cos(, abs(, etc.)
export function deleteTrailingToken(text: string): string {
  const multiTokens = [
    "sin⁻¹(", "cos⁻¹(", "tan⁻¹(",
    "asinh(", "acosh(", "atanh(",
    "asin(", "acos(", "atan(",
    "sinh(", "cosh(", "tanh(",
    "sin(", "cos(", "tan(",
    "sin⁻¹", "cos⁻¹", "tan⁻¹",
    "asin", "acos", "atan",
    "sinh", "cosh", "tanh",
    "sin", "cos", "tan",
    "log_(", "log(", "ln(",
    "log_", "log", "ln",
    "abs(", "Abs(", "|",
    "abs", "Abs",
    "Pol(", "Rec(",
    "10^(", "e^(", "^(",
    "10^", "e^",
    "³√(", "√(", "³√", "√",
    "Ans", " P ", " C ", "×10^("
  ];
  for (const tok of multiTokens) {
    if (text.endsWith(tok)) {
      return text.slice(0, -tok.length);
    }
  }
  return text.slice(0, -1);
}

let nextId = 1;
function uid(): string {
  return `item-${nextId++}`;
}

export class CasioCalculatorSession {
  items: ExprItem[] = [];
  cursor: CursorTarget = { location: "main", index: 0 };
  result: string = "0";
  lastNumericResult: number | null = null;
  ans: number = 0;
  memory: number = 0;
  angleMode: "DEG" | "RAD" = "DEG";
  isShiftActive: boolean = false;
  isAlphaActive: boolean = false;
  displayMode: "decimal" | "fraction" | "mixed" | "pi" = "decimal";
  lastResultHadPi: boolean = false;
  history: HistoryEntry[] = [];
  historyIndex: number = -1;
  hasCalculated: boolean = false;
  optnMessage: string | null = null;

  constructor() {
    this.reset();
  }

  reset(): this {
    this.items = [];
    this.cursor = { location: "main", index: 0 };
    this.result = "0";
    this.lastNumericResult = null;
    this.ans = 0;
    this.memory = 0;
    this.angleMode = "DEG";
    this.isShiftActive = false;
    this.isAlphaActive = false;
    this.displayMode = "decimal";
    this.lastResultHadPi = false;
    this.history = [];
    this.historyIndex = -1;
    this.hasCalculated = false;
    this.optnMessage = null;
    return this;
  }

  private getItemIndex(id: string): number {
    return this.items.findIndex((i) => i.id === id);
  }

  // Extract trailing numeric string or power from items (used when turning base into power or fraction)
  private extractTrailingNumber(): { remainingItems: ExprItem[]; extracted: string } {
    if (this.items.length === 0) return { remainingItems: [], extracted: "" };
    const curIdx = this.cursor.location === "main" ? (this.cursor.index ?? this.items.length) : this.items.length;
    if (curIdx <= 0) return { remainingItems: this.items, extracted: "" };

    const last = this.items[curIdx - 1];
    if (!last) return { remainingItems: this.items, extracted: "" };

    // Case 1: Preceding item is a power (e.g. 3²)
    if (last.type === "pow") {
      const extracted = last.exp === "2" ? `${last.base}²` : last.exp === "3" ? `${last.base}³` : `${last.base}^(${last.exp})`;
      const nextItems = [...this.items];
      nextItems.splice(curIdx - 1, 1);
      return { remainingItems: nextItems, extracted };
    }

    // Case 2: Preceding item is text
    if (last.type === "text") {
      const text = last.value;
      // If it ends with a closing parenthesis, find the matching opening parenthesis
      if (text.endsWith(")")) {
        let depth = 0;
        let startIdx = -1;
        for (let i = text.length - 1; i >= 0; i--) {
          if (text[i] === ")") depth++;
          else if (text[i] === "(") {
            depth--;
            if (depth === 0) {
              startIdx = i;
              break;
            }
          }
        }
        if (startIdx !== -1) {
          const beforeParen = text.slice(0, startIdx);
          const fnMatch = beforeParen.match(/([a-zA-Z0-9⁻¹]+)$/);
          const fullStart = fnMatch ? startIdx - fnMatch[1].length : startIdx;
          const extracted = text.slice(fullStart);
          const remVal = text.slice(0, fullStart);
          const nextItems = [...this.items];
          if (remVal) {
            nextItems[curIdx - 1] = { ...last, value: remVal };
          } else {
            nextItems.splice(curIdx - 1, 1);
          }
          return { remainingItems: nextItems, extracted };
        } else {
          // Cross-item scan: opening '(' is in an earlier text item!
          let itemDepth = 0;
          let openItemIdx = -1;
          let openCharIdx = -1;
          for (let i = curIdx - 1; i >= 0; i--) {
            const it = this.items[i];
            if (it.type === "text") {
              for (let c = it.value.length - 1; c >= 0; c--) {
                if (it.value[c] === ")") itemDepth++;
                else if (it.value[c] === "(") {
                  itemDepth--;
                  if (itemDepth === 0) {
                    openItemIdx = i;
                    openCharIdx = c;
                    break;
                  }
                }
              }
              if (itemDepth === 0) break;
            }
          }
          if (openItemIdx !== -1 && itemDepth === 0) {
            const groupItems = this.items.slice(openItemIdx, curIdx);
            const mathContent = serializeToMath(groupItems);
            const remItems = [...this.items.slice(0, openItemIdx)];
            const openItem = this.items[openItemIdx];
            if (openItem.type === "text" && openCharIdx > 0) {
              remItems.push({ ...openItem, value: openItem.value.slice(0, openCharIdx) });
            }
            return { remainingItems: remItems, extracted: mathContent };
          }
        }
      }

      // Otherwise match trailing numbers, decimals, powers, or identifiers
      const match = text.match(/([a-zA-Z0-9²³\.\^]+)$/);
      if (match) {
        const extracted = match[0];
        const remVal = text.slice(0, -extracted.length);
        const nextItems = [...this.items];
        if (remVal) {
          nextItems[curIdx - 1] = { ...last, value: remVal };
        } else {
          nextItems.splice(curIdx - 1, 1);
        }
        return { remainingItems: nextItems, extracted };
      }
    }

    return { remainingItems: this.items, extracted: "" };
  }

  // Append token based on current active cursor position
  private appendToken(token: string): void {
    if (this.cursor.location === "main") {
      const curIdx = this.cursor.index ?? this.items.length;
      const next = [...this.items];
      const prevItem = curIdx > 0 ? next[curIdx - 1] : undefined;
      const currItem = curIdx < next.length ? next[curIdx] : undefined;
      if (prevItem && prevItem.type === "text") {
        next[curIdx - 1] = { ...prevItem, value: prevItem.value + token };
        this.items = next;
      } else if (currItem && currItem.type === "text") {
        next[curIdx] = { ...currItem, value: token + currItem.value };
        this.items = next;
      } else {
        next.splice(curIdx, 0, { id: uid(), type: "text", value: token });
        this.items = next;
      }
      if (curIdx > 0 && this.items[curIdx - 1]?.type === "text") {
        // stay in existing text item
      } else {
        this.cursor = { location: "main", index: curIdx + 1 };
      }
      return;
    }

    if (this.cursor.location === "sqrt") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) => {
        if (item.id === cursorId && item.type === "sqrt") {
          if (item.content.endsWith("/()")) {
            return { ...item, content: item.content.slice(0, -1) + token + ")" };
          }
          if (/\/\([^)]+\)$/.test(item.content)) {
            return { ...item, content: item.content.slice(0, -1) + token + ")" };
          }
          return { ...item, content: item.content + token };
        }
        return item;
      });
      return;
    }

    if (this.cursor.location === "pow-base") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "pow" ? { ...item, base: item.base + token } : item
      );
      return;
    }

    if (this.cursor.location === "pow") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) => {
        if (item.id === cursorId && item.type === "pow") {
          if (item.exp.endsWith("/()")) {
            return { ...item, exp: item.exp.slice(0, -1) + token + ")" };
          }
          if (/\/\([^)]+\)$/.test(item.exp)) {
            return { ...item, exp: item.exp.slice(0, -1) + token + ")" };
          }
          return { ...item, exp: item.exp + token };
        }
        return item;
      });
      return;
    }

    if (this.cursor.location === "frac-num") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) => {
        if (item.id === cursorId && item.type === "frac") {
          if (item.num.endsWith("/()")) {
            return { ...item, num: item.num.slice(0, -1) + token + ")" };
          }
          if (/\/\([^)]+\)$/.test(item.num)) {
            return { ...item, num: item.num.slice(0, -1) + token + ")" };
          }
          return { ...item, num: item.num + token };
        }
        return item;
      });
      return;
    }

    if (this.cursor.location === "frac-den") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) => {
        if (item.id === cursorId && item.type === "frac") {
          if (item.den.endsWith("/()")) {
            return { ...item, den: item.den.slice(0, -1) + token + ")" };
          }
          if (/\/\([^)]+\)$/.test(item.den)) {
            return { ...item, den: item.den.slice(0, -1) + token + ")" };
          }
          return { ...item, den: item.den + token };
        }
        return item;
      });
      return;
    }

    if (this.cursor.location === "mixed-whole") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "mixed_frac" ? { ...item, whole: item.whole + token } : item
      );
      return;
    }

    if (this.cursor.location === "mixed-num") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "mixed_frac" ? { ...item, num: item.num + token } : item
      );
      return;
    }

    if (this.cursor.location === "mixed-den") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "mixed_frac" ? { ...item, den: item.den + token } : item
      );
      return;
    }

    if (this.cursor.location === "log-base") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "logbase" ? { ...item, base: item.base + token } : item
      );
      return;
    }

    if (this.cursor.location === "log-arg") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) =>
        item.id === cursorId && item.type === "logbase" ? { ...item, arg: item.arg + token } : item
      );
      return;
    }

    if (this.cursor.location === "abs") {
      const cursorId = this.cursor.itemId;
      this.items = this.items.map((item) => {
        if (item.id === cursorId && item.type === "abs") {
          if (item.content.endsWith("/()")) {
            return { ...item, content: item.content.slice(0, -1) + token + ")" };
          }
          if (/\/\([^)]+\)$/.test(item.content)) {
            return { ...item, content: item.content.slice(0, -1) + token + ")" };
          }
          return { ...item, content: item.content + token };
        }
        return item;
      });
      return;
    }
  }

  // Navigation Keys: Up, Down, Left, Right
  nav(dir: "UP" | "DOWN" | "LEFT" | "RIGHT"): this {
    if (dir === "RIGHT") {
      if (this.hasCalculated) {
        this.hasCalculated = false;
        if (this.items.length > 0) {
          const first = this.items[0];
          if (first.type === "sqrt") { this.cursor = { location: "sqrt", itemId: first.id }; return this; }
          if (first.type === "frac") { this.cursor = { location: "frac-num", itemId: first.id }; return this; }
          if (first.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: first.id }; return this; }
          if (first.type === "pow") { this.cursor = { location: "pow-base", itemId: first.id }; return this; }
          if (first.type === "logbase") { this.cursor = { location: "log-base", itemId: first.id }; return this; }
          if (first.type === "abs") { this.cursor = { location: "abs", itemId: first.id }; return this; }
        }
        this.cursor = { location: "main", index: 0 };
        return this;
      }
      if (this.cursor.location === "mixed-whole") {
        this.cursor = { location: "mixed-num", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-num") {
        this.cursor = { location: "mixed-den", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-den") {
        const idx = this.getItemIndex(this.cursor.itemId);
        const nextIdx = idx + 1;
        if (nextIdx < this.items.length) {
          const next = this.items[nextIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
        }
        this.cursor = { location: "main", index: nextIdx };
        return this;
      }
      if (this.cursor.location === "frac-num") {
        this.cursor = { location: "frac-den", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "frac-den") {
        const idx = this.getItemIndex(this.cursor.itemId);
        const nextIdx = idx + 1;
        if (nextIdx < this.items.length) {
          const next = this.items[nextIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
        }
        this.cursor = { location: "main", index: nextIdx };
        return this;
      }
      if (this.cursor.location === "pow-base") {
        this.cursor = { location: "pow", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "pow") {
        const idx = this.getItemIndex(this.cursor.itemId);
        const nextIdx = idx + 1;
        if (nextIdx < this.items.length) {
          const next = this.items[nextIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
        }
        this.cursor = { location: "main", index: nextIdx };
        return this;
      }
      if (this.cursor.location === "log-base") {
        this.cursor = { location: "log-arg", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "log-arg") {
        const idx = this.getItemIndex(this.cursor.itemId);
        const nextIdx = idx + 1;
        if (nextIdx < this.items.length) {
          const next = this.items[nextIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
        }
        this.cursor = { location: "main", index: nextIdx };
        return this;
      }
      if (this.cursor.location === "sqrt" || this.cursor.location === "abs") {
        const idx = this.getItemIndex(this.cursor.itemId);
        const nextIdx = idx + 1;
        if (nextIdx < this.items.length) {
          const next = this.items[nextIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
        }
        this.cursor = { location: "main", index: nextIdx };
        return this;
      }
      if (this.cursor.location === "main") {
        const curIdx = this.cursor.index ?? this.items.length;
        if (curIdx < this.items.length) {
          const next = this.items[curIdx];
          if (next.type === "frac") { this.cursor = { location: "frac-num", itemId: next.id }; return this; }
          if (next.type === "mixed_frac") { this.cursor = { location: "mixed-whole", itemId: next.id }; return this; }
          if (next.type === "pow") { this.cursor = { location: "pow-base", itemId: next.id }; return this; }
          if (next.type === "logbase") { this.cursor = { location: "log-base", itemId: next.id }; return this; }
          if (next.type === "sqrt") { this.cursor = { location: "sqrt", itemId: next.id }; return this; }
          if (next.type === "abs") { this.cursor = { location: "abs", itemId: next.id }; return this; }
          this.cursor = { location: "main", index: curIdx + 1 };
          return this;
        }
        if (this.historyIndex > 0) {
          const nextIdx = this.historyIndex - 1;
          this.historyIndex = nextIdx;
          const entry = this.history[nextIdx];
          if (entry) {
            this.items = entry.items.map((it) => ({ ...it, id: uid() }));
            this.result = entry.res;
            this.lastNumericResult = entry.num;
          }
          this.cursor = { location: "main", index: entry ? entry.items.length : 0 };
          this.hasCalculated = false;
        }
        return this;
      }
      return this;
    }

    if (dir === "LEFT") {
      if (this.hasCalculated) {
        this.hasCalculated = false;
        if (this.items.length > 0) {
          const last = this.items[this.items.length - 1];
          if (last.type === "sqrt") { this.cursor = { location: "sqrt", itemId: last.id }; return this; }
          if (last.type === "pow") { this.cursor = { location: "pow", itemId: last.id }; return this; }
          if (last.type === "frac") { this.cursor = { location: "frac-den", itemId: last.id }; return this; }
          if (last.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: last.id }; return this; }
          if (last.type === "logbase") { this.cursor = { location: "log-arg", itemId: last.id }; return this; }
          if (last.type === "abs") { this.cursor = { location: "abs", itemId: last.id }; return this; }
        }
        this.cursor = { location: "main", index: this.items.length };
        return this;
      }
      if (this.cursor.location === "mixed-den") {
        this.cursor = { location: "mixed-num", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-num") {
        this.cursor = { location: "mixed-whole", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-whole") {
        const idx = this.getItemIndex(this.cursor.itemId);
        if (idx > 0) {
          const prev = this.items[idx - 1];
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
        }
        this.cursor = { location: "main", index: Math.max(0, idx) };
        return this;
      }
      if (this.cursor.location === "frac-den") {
        this.cursor = { location: "frac-num", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "frac-num") {
        const idx = this.getItemIndex(this.cursor.itemId);
        if (idx > 0) {
          const prev = this.items[idx - 1];
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
        }
        this.cursor = { location: "main", index: Math.max(0, idx) };
        return this;
      }
      if (this.cursor.location === "pow") {
        this.cursor = { location: "pow-base", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "pow-base") {
        const idx = this.getItemIndex(this.cursor.itemId);
        if (idx > 0) {
          const prev = this.items[idx - 1];
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
        }
        this.cursor = { location: "main", index: Math.max(0, idx) };
        return this;
      }
      if (this.cursor.location === "log-arg") {
        this.cursor = { location: "log-base", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "log-base") {
        const idx = this.getItemIndex(this.cursor.itemId);
        if (idx > 0) {
          const prev = this.items[idx - 1];
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
        }
        this.cursor = { location: "main", index: Math.max(0, idx) };
        return this;
      }
      if (this.cursor.location === "sqrt" || this.cursor.location === "abs") {
        const idx = this.getItemIndex(this.cursor.itemId);
        if (idx > 0) {
          const prev = this.items[idx - 1];
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
        }
        this.cursor = { location: "main", index: Math.max(0, idx) };
        return this;
      }
      if (this.cursor.location === "main") {
        const curIdx = this.cursor.index ?? this.items.length;
        if (curIdx > 0 && this.items.length > 0) {
          const prev = this.items[curIdx - 1];
          if (prev.type === "sqrt") { this.cursor = { location: "sqrt", itemId: prev.id }; return this; }
          if (prev.type === "pow") { this.cursor = { location: "pow", itemId: prev.id }; return this; }
          if (prev.type === "frac") { this.cursor = { location: "frac-den", itemId: prev.id }; return this; }
          if (prev.type === "mixed_frac") { this.cursor = { location: "mixed-den", itemId: prev.id }; return this; }
          if (prev.type === "logbase") { this.cursor = { location: "log-arg", itemId: prev.id }; return this; }
          if (prev.type === "abs") { this.cursor = { location: "abs", itemId: prev.id }; return this; }
          this.cursor = { location: "main", index: curIdx - 1 };
        }
        return this;
      }
      return this;
    }

    if (dir === "DOWN") {
      if (this.cursor.location === "frac-num") {
        this.cursor = { location: "frac-den", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-num") {
        this.cursor = { location: "mixed-den", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "pow") {
        this.cursor = { location: "pow-base", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "log-arg") {
        this.cursor = { location: "log-base", itemId: this.cursor.itemId };
        return this;
      }
      if (this.history.length > 0) {
        const nextIdx = Math.max(-1, this.historyIndex - 1);
        this.historyIndex = nextIdx;
        if (nextIdx >= 0 && this.history[nextIdx]) {
          const entry = this.history[nextIdx];
          this.items = entry.items.map((it) => ({ ...it, id: uid() }));
          this.result = entry.res;
          this.lastNumericResult = entry.num;
          this.cursor = { location: "main", index: entry.items.length };
        } else {
          this.items = [];
          this.result = "0";
          this.lastNumericResult = null;
          this.cursor = { location: "main", index: 0 };
        }
        this.hasCalculated = false;
      }
      return this;
    }

    if (dir === "UP") {
      if (this.cursor.location === "frac-den") {
        this.cursor = { location: "frac-num", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "mixed-den") {
        this.cursor = { location: "mixed-num", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "pow-base") {
        this.cursor = { location: "pow", itemId: this.cursor.itemId };
        return this;
      }
      if (this.cursor.location === "log-base") {
        this.cursor = { location: "log-arg", itemId: this.cursor.itemId };
        return this;
      }
      if (this.history.length > 0) {
        const nextIdx = Math.min(this.history.length - 1, this.historyIndex + 1);
        this.historyIndex = nextIdx;
        if (this.history[nextIdx]) {
          const entry = this.history[nextIdx];
          this.items = entry.items.map((it) => ({ ...it, id: uid() }));
          this.result = entry.res;
          this.lastNumericResult = entry.num;
          this.cursor = { location: "main", index: entry.items.length };
          this.hasCalculated = false;
        }
      }
      return this;
    }

    return this;
  }

  // Button Input Handlers
  press(action: string): this {
    const shift = this.isShiftActive;
    const alpha = this.isAlphaActive;
    this.isShiftActive = false;
    this.isAlphaActive = false;

    // Turn ON / Clear All
    if (action === "ON" || action === "AC") {
      this.items = [];
      this.cursor = { location: "main", index: 0 };
      this.result = "0";
      this.lastNumericResult = null;
      this.hasCalculated = false;
      this.displayMode = "decimal";
      this.optnMessage = null;
      return this;
    }

    // DEL Key
    if (action === "DEL") {
      if (this.hasCalculated) {
        this.hasCalculated = false;
      }

      if (this.cursor.location === "sqrt") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.content.length > 0) {
          const fracEndMatch = item.content.match(/(.*?)\(([^()]+)\)\/\(([^()]*)\)$/);
          if (fracEndMatch) {
            const [, before, num, den] = fracEndMatch;
            if (den.length > 0) {
              const newDen = deleteTrailingToken(den);
              const newContent = `${before}(${num})/(${newDen})`;
              this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "sqrt" ? { ...i, content: newContent } : i));
              return this;
            } else {
              const newContent = `${before}${num}`;
              this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "sqrt" ? { ...i, content: newContent } : i));
              return this;
            }
          }
          const newContent = deleteTrailingToken(item.content);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "sqrt" ? { ...i, content: newContent } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "pow-base") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.base.length > 0) {
          const newBase = deleteTrailingToken(item.base);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "pow" ? { ...i, base: newBase } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "pow") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.exp.length > 0) {
          const newExp = deleteTrailingToken(item.exp);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "pow" ? { ...i, exp: newExp } : i));
        } else {
          this.cursor = { location: "pow-base", itemId: (this.cursor as any).itemId };
        }
        return this;
      }

      if (this.cursor.location === "frac-den") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.den.length > 0) {
          const newDen = deleteTrailingToken(item.den);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "frac" ? { ...i, den: newDen } : i));
        } else {
          this.cursor = { location: "frac-num", itemId: (this.cursor as any).itemId };
        }
        return this;
      }

      if (this.cursor.location === "frac-num") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.num.length > 0) {
          const newNum = deleteTrailingToken(item.num);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "frac" ? { ...i, num: newNum } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "mixed-den") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.den.length > 0) {
          const newDen = deleteTrailingToken(item.den);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "mixed_frac" ? { ...i, den: newDen } : i));
        } else {
          this.cursor = { location: "mixed-num", itemId: (this.cursor as any).itemId };
        }
        return this;
      }

      if (this.cursor.location === "mixed-num") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.num.length > 0) {
          const newNum = deleteTrailingToken(item.num);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "mixed_frac" ? { ...i, num: newNum } : i));
        } else {
          this.cursor = { location: "mixed-whole", itemId: (this.cursor as any).itemId };
        }
        return this;
      }

      if (this.cursor.location === "mixed-whole") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.whole.length > 0) {
          const newWhole = deleteTrailingToken(item.whole);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "mixed_frac" ? { ...i, whole: newWhole } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "log-arg") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.arg.length > 0) {
          const newArg = deleteTrailingToken(item.arg);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "logbase" ? { ...i, arg: newArg } : i));
        } else {
          this.cursor = { location: "log-base", itemId: (this.cursor as any).itemId };
        }
        return this;
      }

      if (this.cursor.location === "log-base") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.base.length > 0) {
          const newBase = deleteTrailingToken(item.base);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "logbase" ? { ...i, base: newBase } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "abs") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.content.length > 0) {
          const newContent = deleteTrailingToken(item.content);
          this.items = this.items.map((i) => (i.id === (this.cursor as any).itemId && i.type === "abs" ? { ...i, content: newContent } : i));
        } else {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.items = this.items.filter((i) => i.id !== (this.cursor as any).itemId);
          this.cursor = { location: "main", index: Math.max(0, idx) };
        }
        return this;
      }

      if (this.cursor.location === "main") {
        const curIdx = this.cursor.index ?? this.items.length;
        if (curIdx <= 0 || this.items.length === 0) return this;
        const target = this.items[curIdx - 1];
        if (target.type === "text") {
          const newVal = deleteTrailingToken(target.value);
          if (newVal.length > 0) {
            const next = [...this.items];
            next[curIdx - 1] = { ...target, value: newVal };
            this.items = next;
          } else {
            const next = [...this.items];
            next.splice(curIdx - 1, 1);
            this.items = next;
            this.cursor = { location: "main", index: Math.max(0, curIdx - 1) };
          }
        } else {
          const next = [...this.items];
          next.splice(curIdx - 1, 1);
          this.items = next;
          this.cursor = { location: "main", index: Math.max(0, curIdx - 1) };
        }
        return this;
      }
      return this;
    }

    // Shift / Alpha toggles
    if (action === "SHIFT") {
      this.isShiftActive = !shift;
      return this;
    }
    if (action === "ALPHA") {
      this.isAlphaActive = !alpha;
      return this;
    }

    // Fraction <-> Decimal (S <=> D)
    if (action === "S_TO_D") {
      if (this.lastNumericResult !== null) {
        const piFrac = toPiFraction(this.lastNumericResult);
        if (this.lastResultHadPi && piFrac) {
          if (this.displayMode === "pi") {
            this.displayMode = "decimal";
            this.result = String(this.lastNumericResult);
          } else {
            this.displayMode = "pi";
            this.result = formatPiResult(piFrac);
          }
          return this;
        }

        const frac = toFraction(this.lastNumericResult);
        const hasMixed = frac && frac.den !== 1 && Math.abs(frac.num) > frac.den;
        if (this.displayMode === "decimal") {
          this.displayMode = "fraction";
        } else if (this.displayMode === "fraction") {
          this.displayMode = hasMixed ? "mixed" : "decimal";
        } else {
          this.displayMode = "decimal";
        }
      }
      return this;
    }

    // OPTN Button
    if (action === "OPTN") {
      this.optnMessage = this.optnMessage ? null : `Angle: ${this.angleMode} | Ans: ${this.ans} | M: ${this.memory}`;
      return this;
    }

    // STO & M+
    if (action === "STO") {
      if (shift) {
        this.appendToken(String(this.memory));
      } else {
        const val = this.lastNumericResult ?? this.ans;
        this.memory = val;
        this.optnMessage = `Stored M = ${val}`;
      }
      return this;
    }

    if (action === "M_PLUS") {
      const val = this.lastNumericResult ?? this.ans;
      if (shift) {
        this.memory -= val;
        this.optnMessage = `M- = ${this.memory}`;
      } else {
        this.memory += val;
        this.optnMessage = `M+ = ${this.memory}`;
      }
      return this;
    }

    // ENG (Engineering exponent toggle)
    if (action === "ENG") {
      if (this.lastNumericResult !== null) {
        const val = this.lastNumericResult;
        if (val === 0) {
          this.result = "0×10^0";
          return this;
        }
        const exp = Math.floor(Math.log10(Math.abs(val)));
        const engExp = Math.floor(exp / 3) * 3;
        const mantissa = this.lastNumericResult / Math.pow(10, engExp);
        this.result = `${Number(mantissa.toFixed(4))}×10^${engExp}`;
      }
      return this;
    }

    // DMS (° ' ")
    if (action === "DMS") {
      if (this.lastNumericResult !== null) {
        const total = this.lastNumericResult;
        const d = Math.floor(Math.abs(total));
        const mFloat = (Math.abs(total) - d) * 60;
        const m = Math.floor(mFloat);
        const s = Math.round((mFloat - m) * 60);
        this.result = `${total < 0 ? "-" : ""}${d}°${m}'${s}"`;
      } else {
        this.appendToken("°");
      }
      return this;
    }

    // EQUALS (=) Execute
    if (action === "=") {
      const mathStr = serializeToMath(this.items);
      if (!mathStr.trim()) return this;
      const textRepr = serializeToText(this.items);
      const hasPiInput =
        mathStr.includes("π") ||
        textRepr.includes("π") ||
        (this.lastResultHadPi && (mathStr.includes("Ans") || textRepr.includes("Ans")));
      const { num, text, piFrac } = evaluateExpression(mathStr, {
        angleMode: this.angleMode,
        ans: this.ans,
        hasPi: hasPiInput,
      });
      this.result = text;
      if (!isNaN(num) && isFinite(num)) {
        this.lastNumericResult = num;
        this.ans = num;
        const snapshotItems: ExprItem[] = this.items.map((i) => ({ ...i }));
        this.history = [
          { items: snapshotItems, res: text, num },
          ...this.history.slice(0, 19),
        ];
        this.historyIndex = -1;

        if (hasPiInput && piFrac) {
          this.displayMode = "pi";
          this.lastResultHadPi = true;
        } else {
          this.lastResultHadPi = false;
          const frac = toFraction(num);
          if (frac && frac.den !== 1 && Math.abs(num) < 1000) {
            this.displayMode = "fraction";
          } else {
            this.displayMode = "decimal";
          }
        }
      }
      this.hasCalculated = true;
      return this;
    }

    // Angle Mode Toggle
    if (action === "MODE_TOGGLE") {
      this.angleMode = this.angleMode === "DEG" ? "RAD" : "DEG";
      return this;
    }

    // If starting a fresh calculation right after equals:
    if (this.hasCalculated) {
      if (action === "FRAC" || action === "MIXED_FRAC") {
        const fracId = uid();
        this.items = [{ id: fracId, type: "frac", num: "Ans", den: "" }];
        this.cursor = { location: "frac-den", itemId: fracId };
        this.hasCalculated = false;
        return this;
      }
      if (["+", "−", "×", "÷", "SQUARE", "CUBE", "POWER"].includes(action)) {
        this.items = [{ id: uid(), type: "text", value: "Ans" }];
      } else {
        this.items = [];
      }
      this.cursor = { location: "main", index: this.items.length };
      this.hasCalculated = false;
    }

    // ------------------------------------------------------------
    // 1. VERTICAL FRACTION BUTTON (■/■) & MIXED FRACTION (■■/■)
    // ------------------------------------------------------------
    if (action === "MIXED_FRAC" || (action === "FRAC" && shift)) {
      if (this.hasCalculated) this.hasCalculated = false;
      const { remainingItems, extracted } = this.extractTrailingNumber();
      const fracId = uid();
      const newMixedItem: ExprItem = {
        id: fracId,
        type: "mixed_frac",
        whole: extracted || "",
        num: "",
        den: "",
      };
      this.items = [...remainingItems, newMixedItem];
      if (extracted) {
        this.cursor = { location: "mixed-num", itemId: fracId };
      } else {
        this.cursor = { location: "mixed-whole", itemId: fracId };
      }
      return this;
    }

    if (action === "FRAC") {
      if (this.hasCalculated) this.hasCalculated = false;

      if (this.cursor.location === "sqrt") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.type === "sqrt") {
          const match = item.content.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const extracted = match[0];
            const rem = item.content.slice(0, -extracted.length);
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "sqrt"
                ? { ...i, content: `${rem}(${extracted})/()` }
                : i
            );
          } else {
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "sqrt"
                ? { ...i, content: `${item.content}()/()` }
                : i
            );
          }
          return this;
        }
      }

      if (this.cursor.location === "pow") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.type === "pow") {
          const match = item.exp.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const extracted = match[0];
            const rem = item.exp.slice(0, -extracted.length);
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "pow"
                ? { ...i, exp: `${rem}(${extracted})/()` }
                : i
            );
          } else {
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "pow"
                ? { ...i, exp: `${item.exp}()/()` }
                : i
            );
          }
          return this;
        }
      }

      if (this.cursor.location === "abs") {
        const item = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
        if (item && item.type === "abs") {
          const match = item.content.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const extracted = match[0];
            const rem = item.content.slice(0, -extracted.length);
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "abs"
                ? { ...i, content: `${rem}(${extracted})/()` }
                : i
            );
          } else {
            this.items = this.items.map((i) =>
              i.id === (this.cursor as any).itemId && i.type === "abs"
                ? { ...i, content: `${item.content}()/()` }
                : i
            );
          }
          return this;
        }
      }

      if (this.cursor.location !== "main") {
        this.appendToken("/");
        return this;
      }
      const { remainingItems, extracted } = this.extractTrailingNumber();
      const fracId = uid();
      const newFracItem: ExprItem = {
        id: fracId,
        type: "frac",
        num: extracted || "",
        den: "",
      };
      this.items = [...remainingItems, newFracItem];
      if (extracted) {
        this.cursor = { location: "frac-den", itemId: fracId };
      } else {
        this.cursor = { location: "frac-num", itemId: fracId };
      }
      return this;
    }

    // ------------------------------------------------------------
    // 2. ROOT BUTTON (√■ / ³√■)
    // ------------------------------------------------------------
    if (action === "SQRT") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location !== "main") {
        this.appendToken(shift ? "³√(" : "√(");
        return this;
      }
      const sqrtId = uid();
      const newSqrtItem: ExprItem = {
        id: sqrtId,
        type: "sqrt",
        root: shift ? 3 : 2,
        content: "",
      };
      this.items = [...this.items, newSqrtItem];
      this.cursor = { location: "sqrt", itemId: sqrtId };
      return this;
    }

    // ------------------------------------------------------------
    // 3. POWERS (x^■, x², x³) - Blank fill in if no number
    // ------------------------------------------------------------
    if (action === "POWER") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location !== "main") {
        this.appendToken("^(");
        return this;
      }
      const { remainingItems, extracted } = this.extractTrailingNumber();
      const powId = uid();
      const newPowItem: ExprItem = {
        id: powId,
        type: "pow",
        base: extracted || "",
        exp: "",
      };
      this.items = [...remainingItems, newPowItem];
      if (extracted) {
        this.cursor = { location: "pow", itemId: powId };
      } else {
        this.cursor = { location: "pow-base", itemId: powId };
      }
      return this;
    }

    if (action === "SQUARE") {
      if (this.hasCalculated) this.hasCalculated = false;
      const expVal = shift ? "3" : "2";
      if (this.cursor.location !== "main") {
        this.appendToken(shift ? "³" : "²");
        return this;
      }
      const { remainingItems, extracted } = this.extractTrailingNumber();
      const powId = uid();
      if (extracted) {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: extracted,
          exp: expVal,
        };
        this.items = [...remainingItems, newPowItem];
        this.cursor = { location: "main", index: remainingItems.length + 1 };
      } else {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: "",
          exp: expVal,
        };
        this.items = [...remainingItems, newPowItem];
        this.cursor = { location: "pow-base", itemId: powId };
      }
      return this;
    }

    if (action === "CUBE") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location !== "main") {
        this.appendToken("³");
        return this;
      }
      const { remainingItems, extracted } = this.extractTrailingNumber();
      const powId = uid();
      if (extracted) {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: extracted,
          exp: "3",
        };
        this.items = [...remainingItems, newPowItem];
        this.cursor = { location: "main", index: remainingItems.length + 1 };
      } else {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: "",
          exp: "3",
        };
        this.items = [...remainingItems, newPowItem];
        this.cursor = { location: "pow-base", itemId: powId };
      }
      return this;
    }

    // ------------------------------------------------------------
    // 4. LOGARITHMS: 10^■ (POW_10), log_■■ (LOG_BASE), log (LOG)
    // ------------------------------------------------------------
    if (action === "POW_10") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location !== "main") {
        this.appendToken("10^(");
        return this;
      }
      const powId = uid();
      const newPowItem: ExprItem = {
        id: powId,
        type: "pow",
        base: "10",
        exp: "",
      };
      this.items = [...this.items, newPowItem];
      this.cursor = { location: "pow", itemId: powId };
      return this;
    }

    if (action === "LOG_BASE") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location !== "main") {
        this.appendToken("log_(");
        return this;
      }
      const logId = uid();
      const newLogItem: ExprItem = {
        id: logId,
        type: "logbase",
        base: "",
        arg: "",
      };
      this.items = [...this.items, newLogItem];
      this.cursor = { location: "log-base", itemId: logId };
      return this;
    }

    if (action === "LOG") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (shift) {
        return this.press("POW_10");
      }
      this.appendToken("log(");
      return this;
    }

    // ------------------------------------------------------------
    // 5. ABS BUTTON (|x|)
    // ------------------------------------------------------------
    if (action === "ABS") {
      if (this.hasCalculated) this.hasCalculated = false;
      if (this.cursor.location === "sqrt" || this.cursor.location === "frac-num" || this.cursor.location === "frac-den" || this.cursor.location === "pow") {
        this.appendToken("|");
        return this;
      }
      if (this.cursor.location !== "main") {
        this.appendToken("|");
        return this;
      }
      const absId = uid();
      const newAbsItem: ExprItem = {
        id: absId,
        type: "abs",
        content: "",
      };
      this.items = [...this.items, newAbsItem];
      this.cursor = { location: "abs", itemId: absId };
      return this;
    }

    // Standard Operators & Numbers
    switch (action) {
      case "0":
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        this.appendToken(action);
        break;
      case "(":
        if (this.cursor.location === "log-arg") {
          const it = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
          if (it && !it.arg) {
            return this;
          }
        }
        this.appendToken("(");
        break;
      case ")":
        if (this.cursor.location === "pow") {
          const it = this.items.find((i) => i.id === (this.cursor as any).itemId) as any;
          if (it && it.type === "pow") {
            const depth = (it.exp.match(/\(/g) || []).length - (it.exp.match(/\)/g) || []).length;
            if (depth <= 0) {
              const idx = this.getItemIndex((this.cursor as any).itemId);
              this.cursor = { location: "main", index: idx + 1 };
              return this;
            }
          }
        }
        if (this.cursor.location === "log-base") {
          this.cursor = { location: "log-arg", itemId: (this.cursor as any).itemId };
          return this;
        }
        if (this.cursor.location === "log-arg") {
          const idx = this.getItemIndex((this.cursor as any).itemId);
          this.cursor = { location: "main", index: idx + 1 };
          return this;
        }
        this.appendToken(")");
        break;
      case ".":
        if (shift) {
          this.appendToken(String(Number(Math.random().toFixed(3))));
        } else if (alpha) {
          this.appendToken(String(Math.floor(Math.random() * 6) + 1));
        } else {
          this.appendToken(".");
        }
        break;
      case "+":
        this.appendToken(shift ? "Pol(" : "+");
        break;
      case "−":
        this.appendToken(shift ? "Rec(" : "−");
        break;
      case "×":
        this.appendToken(shift ? " P " : "×");
        break;
      case "÷":
        this.appendToken(shift ? " C " : "÷");
        break;
      case "NEG":
        this.appendToken("−");
        break;
      case "ANS":
        this.appendToken(shift ? "%" : "Ans");
        break;
      case "EXP":
        this.appendToken(shift ? "π" : alpha ? "e" : "×10^(");
        break;
      case "PI":
        this.appendToken("π");
        break;
      case "INV":
        this.appendToken(shift ? "!" : "^(-1)");
        break;
      case "SIN": {
        const token = shift ? "asin(" : "sin(";
        this.appendToken(token);
        break;
      }
      case "COS": {
        const token = shift ? "acos(" : "cos(";
        this.appendToken(token);
        break;
      }
      case "TAN": {
        const token = shift ? "atan(" : "tan(";
        this.appendToken(token);
        break;
      }
      case "LN":
        this.appendToken(shift ? "e^(" : "ln(");
        break;
      default:
        this.appendToken(action);
    }

    return this;
  }

  // Sequence helper: accepts button strings or navigation keywords "NAV:UP", "NAV:DOWN", "NAV:LEFT", "NAV:RIGHT", or "UP", "DOWN", "LEFT", "RIGHT"
  pressSequence(...actions: string[]): this {
    for (const act of actions) {
      if (act === "NAV:UP" || act === "UP") {
        this.nav("UP");
      } else if (act === "NAV:DOWN" || act === "DOWN") {
        this.nav("DOWN");
      } else if (act === "NAV:LEFT" || act === "LEFT") {
        this.nav("LEFT");
      } else if (act === "NAV:RIGHT" || act === "RIGHT") {
        this.nav("RIGHT");
      } else {
        this.press(act);
      }
    }
    return this;
  }

  // Natural Display string or result formatter for verification
  getDisplayResult(): string {
    if (this.lastNumericResult !== null) {
      if (this.displayMode === "pi") {
        const piFrac = toPiFraction(this.lastNumericResult);
        if (piFrac) {
          return formatPiResult(piFrac);
        }
      } else if (this.displayMode === "fraction") {
        const frac = toFraction(this.lastNumericResult);
        if (frac && frac.den !== 1) {
          return `${frac.num}/${frac.den}`;
        }
      } else if (this.displayMode === "mixed") {
        const frac = toFraction(this.lastNumericResult);
        if (frac && frac.den !== 1 && Math.abs(frac.num) > frac.den) {
          const whole = Math.trunc(frac.num / frac.den);
          const rem = Math.abs(frac.num % frac.den);
          return `${whole} ${rem}/${frac.den}`;
        }
      }
    }
    return this.result;
  }

  // Clones the session snapshot for immutable React state updates
  clone(): CasioCalculatorSession {
    const s = new CasioCalculatorSession();
    s.items = this.items.map((i) => ({ ...i }));
    s.cursor = { ...this.cursor };
    s.result = this.result;
    s.lastNumericResult = this.lastNumericResult;
    s.ans = this.ans;
    s.memory = this.memory;
    s.angleMode = this.angleMode;
    s.isShiftActive = this.isShiftActive;
    s.isAlphaActive = this.isAlphaActive;
    s.displayMode = this.displayMode;
    s.lastResultHadPi = this.lastResultHadPi;
    s.history = this.history.map((h) => ({
      items: h.items.map((i) => ({ ...i })),
      res: h.res,
      num: h.num,
    }));
    s.historyIndex = this.historyIndex;
    s.hasCalculated = this.hasCalculated;
    s.optnMessage = this.optnMessage;
    return s;
  }
}
