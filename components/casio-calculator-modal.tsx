"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Volume2, VolumeX } from "lucide-react";
import {
  evaluateExpression,
  toFraction,
  toPiFraction,
  formatPiResult,
  serializeToMath,
  serializeToText,
  ExprItem,
} from "../lib/casio-math-engine";

interface CasioCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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

interface HistoryEntry {
  items: ExprItem[];
  res: string;
  num: number | null;
}

// Deletes entire multi-letter function names in one keystroke (e.g. sin(, cos(, abs(, etc.)
function deleteTrailingToken(text: string): string {
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

// Sub-expression formatter for rendering inside fractions, roots, and powers
function formatSubExpression(val: string): React.ReactNode {
  if (!val) return null;

  // 1. Check for absolute value: abs(...) or Abs(...) or |...|
  const absMatch = val.match(/(.*?)(?:abs|Abs)\(([^()]*)\)(.*)/) || val.match(/(.*?)\|([^|]+)\|(.*)/);
  if (absMatch) {
    const [, before, content, after] = absMatch;
    return (
      <span className="inline-flex items-center align-middle flex-wrap">
        {before && formatSubExpression(before)}
        <span className="inline-flex items-center align-middle mx-0.5 font-mono font-bold">
          <span className="text-xs sm:text-sm">|</span>
          <span className="px-0.5">{formatSubExpression(content) || <span className="text-[#121d12]/40 select-none">■</span>}</span>
          <span className="text-xs sm:text-sm">|</span>
        </span>
        {after && formatSubExpression(after)}
      </span>
    );
  }
  const openAbsMatch = val.match(/(.*?)(?:abs|Abs)\((.*)/) || val.match(/(.*?)\|(.*)/);
  if (openAbsMatch) {
    const [, before, content] = openAbsMatch;
    return (
      <span className="inline-flex items-center align-middle flex-wrap">
        {before && formatSubExpression(before)}
        <span className="inline-flex items-center align-middle mx-0.5 font-mono font-bold">
          <span className="text-xs sm:text-sm">|</span>
          <span className="px-0.5">{formatSubExpression(content) || <span className="text-[#121d12]/40 select-none">■</span>}</span>
          <span className="text-xs sm:text-sm text-[#121d12]/40">|</span>
        </span>
      </span>
    );
  }

  // 2. Parenthesized fraction: (num)/(den) or (num)/()
  const parenFracMatch = val.match(/(.*?)\(([^()]+)\)\/\(?([^()]*)\)?(.*)/);
  if (parenFracMatch) {
    const [, before, num, den, after] = parenFracMatch;
    return (
      <span className="inline-flex items-center align-middle flex-wrap">
        {before && formatSubExpression(before)}
        <span className="inline-flex flex-col items-center justify-center leading-none align-middle mx-1 font-mono shrink-0 py-0.5">
          <span className="text-[10px] sm:text-[11px] border-b border-[#121d12] px-1 pb-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none">
            {formatSubExpression(num)}
          </span>
          <span className="text-[10px] sm:text-[11px] px-1 pt-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none">
            {den ? formatSubExpression(den) : <span className="text-[#121d12]/40 select-none">■</span>}
          </span>
        </span>
        {after && formatSubExpression(after)}
      </span>
    );
  }

  // 3. Simple fraction or fraction in progress: e.g. 3²/5, 9/16, (5)/, or 5/
  const simpleFracMatch = val.match(/(.*?)([\d\w²³\.\^\(\)]+)\/([\d\w²³\.\^\(\)]*)(.*)/);
  if (simpleFracMatch) {
    const [, before, num, den, after] = simpleFracMatch;
    const cleanNum = num.startsWith("(") && num.endsWith(")") ? num.slice(1, -1) : num;
    return (
      <span className="inline-flex items-center align-middle flex-wrap">
        {before && formatSubExpression(before)}
        <span className="inline-flex flex-col items-center justify-center leading-none align-middle mx-1 font-mono shrink-0 py-0.5">
          <span className="text-[10px] sm:text-[11px] border-b border-[#121d12] px-1 pb-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none">
            {formatSubExpression(cleanNum)}
          </span>
          <span className="text-[10px] sm:text-[11px] px-1 pt-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none">
            {den ? formatSubExpression(den) : <span className="text-[#121d12]/40 select-none">■</span>}
          </span>
        </span>
        {after && formatSubExpression(after)}
      </span>
    );
  }

  const displayVal = val
    .replace(/asin\(/g, "sin⁻¹(")
    .replace(/acos\(/g, "cos⁻¹(")
    .replace(/atan\(/g, "tan⁻¹(");

  const parts = displayVal.split(/(²|³|\^\([^\)]*\)|\^[0-9]+)/g);
  if (parts.length === 1) {
    return <span>{displayVal}</span>;
  }

  return (
    <span>
      {parts.map((part, i) => {
        if (part === "²") {
          return (
            <sup key={i} className="text-[9px] sm:text-[10px] font-black leading-none -top-1.5 relative">
              2
            </sup>
          );
        }
        if (part === "³") {
          return (
            <sup key={i} className="text-[9px] sm:text-[10px] font-black leading-none -top-1.5 relative">
              3
            </sup>
          );
        }
        if (part.startsWith("^(") && part.endsWith(")")) {
          return (
            <sup key={i} className="text-[9px] sm:text-[10px] font-black leading-none -top-1.5 relative">
              {part.slice(2, -1) || "■"}
            </sup>
          );
        }
        if (part.startsWith("^")) {
          return (
            <sup key={i} className="text-[9px] sm:text-[10px] font-black leading-none -top-1.5 relative">
              {part.slice(1) || "■"}
            </sup>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

let nextId = 1;
function uid() {
  return `item-${nextId++}`;
}

export default function CasioCalculatorModal({
  isOpen,
  onClose,
}: CasioCalculatorModalProps) {
  // Structured items list for Natural Textbook display
  const [items, setItems] = useState<ExprItem[]>([]);
  const [cursor, setCursor] = useState<CursorTarget>({ location: "main" });

  const [result, setResult] = useState<string>("0");
  const [lastNumericResult, setLastNumericResult] = useState<number | null>(null);
  const [ans, setAns] = useState<number>(0);
  const [memory, setMemory] = useState<number>(0);
  const [angleMode, setAngleMode] = useState<"DEG" | "RAD">("DEG");
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [isAlphaActive, setIsAlphaActive] = useState(false);
  const [displayMode, setDisplayMode] = useState<"decimal" | "fraction" | "mixed" | "pi">("decimal");
  const [lastResultHadPi, setLastResultHadPi] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [optnMessage, setOptnMessage] = useState<string | null>(null);

  // Synchronized refs to eliminate stale closure drops
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;
  const historyRef = useRef(history);
  historyRef.current = history;
  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;
  const hasCalculatedRef = useRef(hasCalculated);
  hasCalculatedRef.current = hasCalculated;

  // Audio click generator
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playClick = (freq: number = 800) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
      if (audioCtxRef.current) {
        const osc = audioCtxRef.current.createOscillator();
        const gain = audioCtxRef.current.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtxRef.current.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtxRef.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtxRef.current.currentTime + 0.035);
        osc.connect(gain);
        gain.connect(audioCtxRef.current.destination);
        osc.start();
        osc.stop(audioCtxRef.current.currentTime + 0.035);
      }
    } catch {}
  };

  const getItemIndex = (id: string, currentItems: ExprItem[]): number => {
    return currentItems.findIndex((i) => i.id === id);
  };

  // Extract trailing numeric string or power from items (used when turning base into power or fraction)
  const extractTrailingNumber = (): { remainingItems: ExprItem[]; extracted: string } => {
    if (items.length === 0) return { remainingItems: [], extracted: "" };
    const curIdx = cursor.location === "main" ? (cursor.index ?? items.length) : items.length;
    if (curIdx <= 0) return { remainingItems: items, extracted: "" };

    const last = items[curIdx - 1];
    if (!last) return { remainingItems: items, extracted: "" };

    // Case 1: Preceding item is a power (e.g. 3²)
    if (last.type === "pow") {
      const extracted = last.exp === "2" ? `${last.base}²` : last.exp === "3" ? `${last.base}³` : `${last.base}^(${last.exp})`;
      const nextItems = [...items];
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
          const nextItems = [...items];
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
            const it = items[i];
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
            const groupItems = items.slice(openItemIdx, curIdx);
            const mathContent = serializeToMath(groupItems);
            const remItems = [...items.slice(0, openItemIdx)];
            const openItem = items[openItemIdx];
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
        const nextItems = [...items];
        if (remVal) {
          nextItems[curIdx - 1] = { ...last, value: remVal };
        } else {
          nextItems.splice(curIdx - 1, 1);
        }
        return { remainingItems: nextItems, extracted };
      }
    }

    return { remainingItems: items, extracted: "" };
  };

  // Navigation Keys: Up, Down, Left, Right
  const handleNav = (dir: "UP" | "DOWN" | "LEFT" | "RIGHT") => {
    playClick(500);

    // RIGHT ARROW: Steps out of Root, Exponent, or Fraction Denominator, or edits after =
    if (dir === "RIGHT") {
      if (hasCalculatedRef.current) {
        setHasCalculated(false);
        const currentItems = itemsRef.current;
        if (currentItems.length > 0) {
          const first = currentItems[0];
          if (first.type === "sqrt") { setCursor({ location: "sqrt", itemId: first.id }); return; }
          if (first.type === "frac") { setCursor({ location: "frac-num", itemId: first.id }); return; }
          if (first.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: first.id }); return; }
          if (first.type === "pow") { setCursor({ location: "pow-base", itemId: first.id }); return; }
          if (first.type === "logbase") { setCursor({ location: "log-base", itemId: first.id }); return; }
          if (first.type === "abs") { setCursor({ location: "abs", itemId: first.id }); return; }
        }
        setCursor({ location: "main", index: 0 });
        return;
      }
      if (cursor.location === "mixed-whole") {
        setCursor({ location: "mixed-num", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-num") {
        setCursor({ location: "mixed-den", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-den") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        const nextIdx = idx + 1;
        if (nextIdx < itemsRef.current.length) {
          const next = itemsRef.current[nextIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
        }
        setCursor({ location: "main", index: nextIdx });
        return;
      }
      if (cursor.location === "frac-num") {
        setCursor({ location: "frac-den", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "frac-den") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        const nextIdx = idx + 1;
        if (nextIdx < itemsRef.current.length) {
          const next = itemsRef.current[nextIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
        }
        setCursor({ location: "main", index: nextIdx });
        return;
      }
      if (cursor.location === "pow-base") {
        setCursor({ location: "pow", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "pow") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        const nextIdx = idx + 1;
        if (nextIdx < itemsRef.current.length) {
          const next = itemsRef.current[nextIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
        }
        setCursor({ location: "main", index: nextIdx });
        return;
      }
      if (cursor.location === "log-base") {
        setCursor({ location: "log-arg", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "log-arg") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        const nextIdx = idx + 1;
        if (nextIdx < itemsRef.current.length) {
          const next = itemsRef.current[nextIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
        }
        setCursor({ location: "main", index: nextIdx });
        return;
      }
      if (cursor.location === "sqrt" || cursor.location === "abs") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        const nextIdx = idx + 1;
        if (nextIdx < itemsRef.current.length) {
          const next = itemsRef.current[nextIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
        }
        setCursor({ location: "main", index: nextIdx });
        return;
      }
      if (cursor.location === "main") {
        const curIdx = cursor.index ?? itemsRef.current.length;
        if (curIdx < itemsRef.current.length) {
          const next = itemsRef.current[curIdx];
          if (next.type === "frac") { setCursor({ location: "frac-num", itemId: next.id }); return; }
          if (next.type === "mixed_frac") { setCursor({ location: "mixed-whole", itemId: next.id }); return; }
          if (next.type === "pow") { setCursor({ location: "pow-base", itemId: next.id }); return; }
          if (next.type === "logbase") { setCursor({ location: "log-base", itemId: next.id }); return; }
          if (next.type === "sqrt") { setCursor({ location: "sqrt", itemId: next.id }); return; }
          if (next.type === "abs") { setCursor({ location: "abs", itemId: next.id }); return; }
          setCursor({ location: "main", index: curIdx + 1 });
          return;
        }
        // At end: navigate history down if currently viewing older history
        const currIdx = historyIndexRef.current;
        if (currIdx > 0) {
          const nextIdx = currIdx - 1;
          setHistoryIndex(nextIdx);
          const entry = historyRef.current[nextIdx];
          if (entry) {
            setItems(entry.items.map((it) => ({ ...it, id: uid() })));
            setResult(entry.res);
            setLastNumericResult(entry.num);
          }
          setCursor({ location: "main", index: entry ? entry.items.length : 0 });
          setHasCalculated(false);
        }
        return;
      }
      return;
    }

    // LEFT ARROW: Steps backwards across blocks, sub-expressions, or text items
    if (dir === "LEFT") {
      if (hasCalculatedRef.current) {
        setHasCalculated(false);
        const currentItems = itemsRef.current;
        if (currentItems.length > 0) {
          const last = currentItems[currentItems.length - 1];
          if (last.type === "sqrt") { setCursor({ location: "sqrt", itemId: last.id }); return; }
          if (last.type === "pow") { setCursor({ location: "pow", itemId: last.id }); return; }
          if (last.type === "frac") { setCursor({ location: "frac-den", itemId: last.id }); return; }
          if (last.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: last.id }); return; }
          if (last.type === "logbase") { setCursor({ location: "log-arg", itemId: last.id }); return; }
          if (last.type === "abs") { setCursor({ location: "abs", itemId: last.id }); return; }
        }
        setCursor({ location: "main", index: currentItems.length });
        return;
      }
      if (cursor.location === "mixed-den") {
        setCursor({ location: "mixed-num", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-num") {
        setCursor({ location: "mixed-whole", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-whole") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        if (idx > 0) {
          const prev = itemsRef.current[idx - 1];
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
        }
        setCursor({ location: "main", index: Math.max(0, idx) });
        return;
      }
      if (cursor.location === "frac-den") {
        setCursor({ location: "frac-num", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "frac-num") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        if (idx > 0) {
          const prev = itemsRef.current[idx - 1];
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
        }
        setCursor({ location: "main", index: Math.max(0, idx) });
        return;
      }
      if (cursor.location === "pow") {
        setCursor({ location: "pow-base", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "pow-base") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        if (idx > 0) {
          const prev = itemsRef.current[idx - 1];
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
        }
        setCursor({ location: "main", index: Math.max(0, idx) });
        return;
      }
      if (cursor.location === "log-arg") {
        setCursor({ location: "log-base", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "log-base") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        if (idx > 0) {
          const prev = itemsRef.current[idx - 1];
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
        }
        setCursor({ location: "main", index: Math.max(0, idx) });
        return;
      }
      if (cursor.location === "sqrt" || cursor.location === "abs") {
        const idx = getItemIndex(cursor.itemId, itemsRef.current);
        if (idx > 0) {
          const prev = itemsRef.current[idx - 1];
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
        }
        setCursor({ location: "main", index: Math.max(0, idx) });
        return;
      }
      if (cursor.location === "main") {
        const curIdx = cursor.index ?? itemsRef.current.length;
        if (curIdx > 0 && itemsRef.current.length > 0) {
          const prev = itemsRef.current[curIdx - 1];
          if (prev.type === "sqrt") { setCursor({ location: "sqrt", itemId: prev.id }); return; }
          if (prev.type === "pow") { setCursor({ location: "pow", itemId: prev.id }); return; }
          if (prev.type === "frac") { setCursor({ location: "frac-den", itemId: prev.id }); return; }
          if (prev.type === "mixed_frac") { setCursor({ location: "mixed-den", itemId: prev.id }); return; }
          if (prev.type === "logbase") { setCursor({ location: "log-arg", itemId: prev.id }); return; }
          if (prev.type === "abs") { setCursor({ location: "abs", itemId: prev.id }); return; }
          setCursor({ location: "main", index: curIdx - 1 });
        }
        return;
      }
      return;
    }

    // DOWN ARROW: Moves vertically down (num -> den, pow -> base, arg -> base) or history down
    if (dir === "DOWN") {
      if (cursor.location === "frac-num") {
        setCursor({ location: "frac-den", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-num") {
        setCursor({ location: "mixed-den", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "pow") {
        setCursor({ location: "pow-base", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "log-arg") {
        setCursor({ location: "log-base", itemId: cursor.itemId });
        return;
      }
      const hist = historyRef.current;
      if (hist.length > 0) {
        const currIdx = historyIndexRef.current;
        const nextIdx = Math.max(-1, currIdx - 1);
        setHistoryIndex(nextIdx);
        if (nextIdx >= 0 && hist[nextIdx]) {
          const entry = hist[nextIdx];
          setItems(entry.items.map((it) => ({ ...it, id: uid() })));
          setResult(entry.res);
          setLastNumericResult(entry.num);
          setCursor({ location: "main", index: entry.items.length });
          setHasCalculated(false);
        } else {
          setItems([]);
          setResult("0");
          setLastNumericResult(null);
          setCursor({ location: "main", index: 0 });
          setHasCalculated(false);
        }
      }
      return;
    }

    // UP ARROW: Moves vertically up (den -> num, base -> pow, base -> arg) or history up
    if (dir === "UP") {
      if (cursor.location === "frac-den") {
        setCursor({ location: "frac-num", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "mixed-den") {
        setCursor({ location: "mixed-num", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "pow-base") {
        setCursor({ location: "pow", itemId: cursor.itemId });
        return;
      }
      if (cursor.location === "log-base") {
        setCursor({ location: "log-arg", itemId: cursor.itemId });
        return;
      }
      const hist = historyRef.current;
      if (hist.length > 0) {
        const currIdx = historyIndexRef.current;
        const nextIdx = Math.min(hist.length - 1, currIdx + 1);
        setHistoryIndex(nextIdx);
        if (hist[nextIdx]) {
          const entry = hist[nextIdx];
          setItems(entry.items.map((it) => ({ ...it, id: uid() })));
          setResult(entry.res);
          setLastNumericResult(entry.num);
          setCursor({ location: "main", index: entry.items.length });
          setHasCalculated(false);
        }
      }
      return;
    }
  };

  // Append token based on current active cursor position
  const appendToken = (token: string) => {
    if (cursor.location === "main") {
      const curIdx = cursor.index ?? items.length;
      setItems((prev) => {
        const next = [...prev];
        const prevItem = curIdx > 0 ? next[curIdx - 1] : undefined;
        const currItem = curIdx < next.length ? next[curIdx] : undefined;
        if (prevItem && prevItem.type === "text") {
          next[curIdx - 1] = { ...prevItem, value: prevItem.value + token };
          return next;
        } else if (currItem && currItem.type === "text") {
          next[curIdx] = { ...currItem, value: token + currItem.value };
          return next;
        } else {
          next.splice(curIdx, 0, { id: uid(), type: "text", value: token });
          return next;
        }
      });
      if (curIdx > 0 && items[curIdx - 1]?.type === "text") {
        // stay in existing text item
      } else {
        setCursor({ location: "main", index: curIdx + 1 });
      }
      return;
    }

    if (cursor.location === "sqrt") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === cursor.itemId && item.type === "sqrt") {
            if (item.content.endsWith("/()")) return { ...item, content: item.content.slice(0, -1) + token + ")" };
            if (/\/\([^)]+\)$/.test(item.content)) return { ...item, content: item.content.slice(0, -1) + token + ")" };
            return { ...item, content: item.content + token };
          }
          return item;
        })
      );
      return;
    }

    if (cursor.location === "pow-base") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "pow"
            ? { ...item, base: item.base + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "pow") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === cursor.itemId && item.type === "pow") {
            if (item.exp.endsWith("/()")) return { ...item, exp: item.exp.slice(0, -1) + token + ")" };
            if (/\/\([^)]+\)$/.test(item.exp)) return { ...item, exp: item.exp.slice(0, -1) + token + ")" };
            return { ...item, exp: item.exp + token };
          }
          return item;
        })
      );
      return;
    }

    if (cursor.location === "frac-num") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === cursor.itemId && item.type === "frac") {
            if (item.num.endsWith("/()")) return { ...item, num: item.num.slice(0, -1) + token + ")" };
            if (/\/\([^)]+\)$/.test(item.num)) return { ...item, num: item.num.slice(0, -1) + token + ")" };
            return { ...item, num: item.num + token };
          }
          return item;
        })
      );
      return;
    }

    if (cursor.location === "frac-den") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === cursor.itemId && item.type === "frac") {
            if (item.den.endsWith("/()")) return { ...item, den: item.den.slice(0, -1) + token + ")" };
            if (/\/\([^)]+\)$/.test(item.den)) return { ...item, den: item.den.slice(0, -1) + token + ")" };
            return { ...item, den: item.den + token };
          }
          return item;
        })
      );
      return;
    }

    if (cursor.location === "mixed-whole") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "mixed_frac"
            ? { ...item, whole: item.whole + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "mixed-num") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "mixed_frac"
            ? { ...item, num: item.num + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "mixed-den") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "mixed_frac"
            ? { ...item, den: item.den + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "log-base") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "logbase"
            ? { ...item, base: item.base + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "log-arg") {
      setItems((prev) =>
        prev.map((item) =>
          item.id === cursor.itemId && item.type === "logbase"
            ? { ...item, arg: item.arg + token }
            : item
        )
      );
      return;
    }

    if (cursor.location === "abs") {
      setItems((prev) =>
        prev.map((item) => {
          if (item.id === cursor.itemId && item.type === "abs") {
            if (item.content.endsWith("/()")) return { ...item, content: item.content.slice(0, -1) + token + ")" };
            if (/\/\([^)]+\)$/.test(item.content)) return { ...item, content: item.content.slice(0, -1) + token + ")" };
            return { ...item, content: item.content + token };
          }
          return item;
        })
      );
      return;
    }
  };

  // Button Input Handlers
  const handleButton = (action: string) => {
    playClick(action === "=" ? 1100 : action === "AC" || action === "DEL" ? 400 : 750);

    const shift = isShiftActive;
    const alpha = isAlphaActive;
    setIsShiftActive(false);
    setIsAlphaActive(false);

    // Turn ON / Clear All
    if (action === "ON" || action === "AC") {
      setItems([]);
      setCursor({ location: "main" });
      setResult("0");
      setLastNumericResult(null);
      setHasCalculated(false);
      setDisplayMode("decimal");
      setLastResultHadPi(false);
      setOptnMessage(null);
      return;
    }

    // DEL Key - deletes entire multi-letter function words in one keystroke!
    if (action === "DEL") {
      if (hasCalculated) {
        setHasCalculated(false);
      }

      if (cursor.location === "sqrt") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.content.length > 0) {
          const fracEndMatch = item.content.match(/(.*?)\(([^()]+)\)\/\(([^()]*)\)$/);
          if (fracEndMatch) {
            const [, before, num, den] = fracEndMatch;
            if (den.length > 0) {
              const newDen = deleteTrailingToken(den);
              const newContent = `${before}(${num})/(${newDen})`;
              setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "sqrt" ? { ...i, content: newContent } : i)));
              return;
            } else {
              const newContent = `${before}${num}`;
              setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "sqrt" ? { ...i, content: newContent } : i)));
              return;
            }
          }
          const newContent = deleteTrailingToken(item.content);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "sqrt" ? { ...i, content: newContent } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "pow-base") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.base.length > 0) {
          const newBase = deleteTrailingToken(item.base);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "pow" ? { ...i, base: newBase } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "pow") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.exp.length > 0) {
          const newExp = deleteTrailingToken(item.exp);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "pow" ? { ...i, exp: newExp } : i)));
        } else {
          setCursor({ location: "pow-base", itemId: cursor.itemId });
        }
        return;
      }

      if (cursor.location === "frac-den") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.den.length > 0) {
          const newDen = deleteTrailingToken(item.den);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "frac" ? { ...i, den: newDen } : i)));
        } else {
          setCursor({ location: "frac-num", itemId: cursor.itemId });
        }
        return;
      }

      if (cursor.location === "frac-num") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.num.length > 0) {
          const newNum = deleteTrailingToken(item.num);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "frac" ? { ...i, num: newNum } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "mixed-den") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.den.length > 0) {
          const newDen = deleteTrailingToken(item.den);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "mixed_frac" ? { ...i, den: newDen } : i)));
        } else {
          setCursor({ location: "mixed-num", itemId: cursor.itemId });
        }
        return;
      }

      if (cursor.location === "mixed-num") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.num.length > 0) {
          const newNum = deleteTrailingToken(item.num);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "mixed_frac" ? { ...i, num: newNum } : i)));
        } else {
          setCursor({ location: "mixed-whole", itemId: cursor.itemId });
        }
        return;
      }

      if (cursor.location === "mixed-whole") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.whole.length > 0) {
          const newWhole = deleteTrailingToken(item.whole);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "mixed_frac" ? { ...i, whole: newWhole } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "log-arg") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.arg.length > 0) {
          const newArg = deleteTrailingToken(item.arg);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "logbase" ? { ...i, arg: newArg } : i)));
        } else {
          setCursor({ location: "log-base", itemId: cursor.itemId });
        }
        return;
      }

      if (cursor.location === "log-base") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.base.length > 0) {
          const newBase = deleteTrailingToken(item.base);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "logbase" ? { ...i, base: newBase } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "abs") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.content.length > 0) {
          const newContent = deleteTrailingToken(item.content);
          setItems((prev) => prev.map((i) => (i.id === cursor.itemId && i.type === "abs" ? { ...i, content: newContent } : i)));
        } else {
          const idx = getItemIndex(cursor.itemId, items);
          setItems((prev) => prev.filter((i) => i.id !== cursor.itemId));
          setCursor({ location: "main", index: Math.max(0, idx) });
        }
        return;
      }

      if (cursor.location === "main") {
        const curIdx = cursor.index ?? items.length;
        if (curIdx <= 0 || items.length === 0) return;
        const target = items[curIdx - 1];
        if (target.type === "text") {
          const newVal = deleteTrailingToken(target.value);
          if (newVal.length > 0) {
            setItems((prev) => {
              const next = [...prev];
              next[curIdx - 1] = { ...target, value: newVal };
              return next;
            });
          } else {
            setItems((prev) => {
              const next = [...prev];
              next.splice(curIdx - 1, 1);
              return next;
            });
            setCursor({ location: "main", index: Math.max(0, curIdx - 1) });
          }
        } else {
          setItems((prev) => {
            const next = [...prev];
            next.splice(curIdx - 1, 1);
            return next;
          });
          setCursor({ location: "main", index: Math.max(0, curIdx - 1) });
        }
        return;
      }
      return;
    }

    // Shift / Alpha toggles
    if (action === "SHIFT") {
      setIsShiftActive(!shift);
      return;
    }
    if (action === "ALPHA") {
      setIsAlphaActive(!alpha);
      return;
    }

    // Fraction <-> Decimal (S <=> D)
    if (action === "S_TO_D") {
      if (lastNumericResult !== null) {
        const piFrac = toPiFraction(lastNumericResult);
        if (lastResultHadPi && piFrac) {
          setDisplayMode((prev) => {
            if (prev === "pi") {
              setResult(String(lastNumericResult));
              return "decimal";
            } else {
              setResult(formatPiResult(piFrac));
              return "pi";
            }
          });
          return;
        }

        const frac = toFraction(lastNumericResult);
        const hasMixed = frac && frac.den !== 1 && Math.abs(frac.num) > frac.den;
        setDisplayMode((prev) => {
          if (prev === "decimal") return "fraction";
          if (prev === "fraction") return hasMixed ? "mixed" : "decimal";
          return "decimal";
        });
      }
      return;
    }

    // OPTN Button
    if (action === "OPTN") {
      setOptnMessage((prev) =>
        prev ? null : `Angle: ${angleMode} | Ans: ${ans} | M: ${memory}`
      );
      setTimeout(() => setOptnMessage(null), 3500);
      return;
    }

    // STO & M+
    if (action === "STO") {
      if (shift) {
        appendToken(String(memory));
      } else {
        const val = lastNumericResult ?? ans;
        setMemory(val);
        setOptnMessage(`Stored M = ${val}`);
        setTimeout(() => setOptnMessage(null), 2500);
      }
      return;
    }

    if (action === "M_PLUS") {
      const val = lastNumericResult ?? ans;
      if (shift) {
        setMemory((prev) => prev - val);
        setOptnMessage(`M- (${memory - val})`);
      } else {
        setMemory((prev) => prev + val);
        setOptnMessage(`M+ (${memory + val})`);
      }
      setTimeout(() => setOptnMessage(null), 2500);
      return;
    }

    // ENG
    if (action === "ENG") {
      if (lastNumericResult !== null && lastNumericResult !== 0) {
        const exp = Math.floor(Math.log10(Math.abs(lastNumericResult)));
        const engExp = Math.floor(exp / 3) * 3;
        const mantissa = lastNumericResult / Math.pow(10, engExp);
        setResult(`${Number(mantissa.toFixed(4))}×10^${engExp}`);
      }
      return;
    }

    // DMS (° ' ")
    if (action === "DMS") {
      if (lastNumericResult !== null) {
        const total = lastNumericResult;
        const d = Math.floor(Math.abs(total));
        const mFloat = (Math.abs(total) - d) * 60;
        const m = Math.floor(mFloat);
        const s = Math.round((mFloat - m) * 60);
        setResult(`${total < 0 ? "-" : ""}${d}°${m}'${s}"`);
      } else {
        appendToken("°");
      }
      return;
    }

    // EQUALS (=) Execute
    if (action === "=") {
      const mathStr = serializeToMath(items);
      if (!mathStr.trim()) return;
      const textRepr = serializeToText(items);
      const hasPiInput =
        mathStr.includes("π") ||
        textRepr.includes("π") ||
        (lastResultHadPi && (mathStr.includes("Ans") || textRepr.includes("Ans")));
      const { num, text, piFrac } = evaluateExpression(mathStr, {
        angleMode,
        ans,
        hasPi: hasPiInput,
      });
      setResult(text);
      if (!isNaN(num) && isFinite(num)) {
        setLastNumericResult(num);
        setAns(num);
        const snapshotItems: ExprItem[] = items.map((i) => ({ ...i }));
        setHistory((prev) => [
          { items: snapshotItems, res: text, num },
          ...prev.slice(0, 19),
        ]);
        setHistoryIndex(-1);

        if (hasPiInput && piFrac) {
          setDisplayMode("pi");
          setLastResultHadPi(true);
        } else {
          setLastResultHadPi(false);
          const frac = toFraction(num);
          if (frac && frac.den !== 1 && Math.abs(num) < 1000) {
            setDisplayMode("fraction");
          } else {
            setDisplayMode("decimal");
          }
        }
      }
      setHasCalculated(true);
      return;
    }

    // Angle Mode Toggle
    if (action === "MODE_TOGGLE") {
      setAngleMode((prev) => (prev === "DEG" ? "RAD" : "DEG"));
      return;
    }

    // If starting a fresh calculation right after equals:
    if (hasCalculated) {
      if (action === "FRAC" || action === "MIXED_FRAC") {
        const fracId = uid();
        setItems([{ id: fracId, type: "frac", num: "Ans", den: "" }]);
        setCursor({ location: "frac-den", itemId: fracId });
        setHasCalculated(false);
        return;
      }
      if (["+", "−", "×", "÷", "SQUARE", "CUBE", "POWER"].includes(action)) {
        setItems([{ id: uid(), type: "text", value: "Ans" }]);
      } else {
        setItems([]);
      }
      setCursor({ location: "main", index: items.length });
      setHasCalculated(false);
    }

    // ------------------------------------------------------------
    // 1. VERTICAL FRACTION (■/■) & MIXED FRACTION (■■/■)
    // ------------------------------------------------------------
    if (action === "MIXED_FRAC" || (action === "FRAC" && shift)) {
      if (hasCalculated) setHasCalculated(false);
      const { remainingItems, extracted } = extractTrailingNumber();
      const fracId = uid();
      const newMixedItem: ExprItem = {
        id: fracId,
        type: "mixed_frac",
        whole: extracted || "",
        num: "",
        den: "",
      };
      setItems([...remainingItems, newMixedItem]);
      if (extracted) {
        setCursor({ location: "mixed-num", itemId: fracId });
      } else {
        setCursor({ location: "mixed-whole", itemId: fracId });
      }
      return;
    }

    if (action === "FRAC") {
      if (hasCalculated) setHasCalculated(false);

      // Inside sqrt:
      if (cursor.location === "sqrt") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.type === "sqrt") {
          const match = item.content.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const ex = match[0];
            const rem = item.content.slice(0, -ex.length);
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "sqrt" ? { ...i, content: `${rem}(${ex})/()` } : i));
          } else {
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "sqrt" ? { ...i, content: `${item.content}()/()` } : i));
          }
          return;
        }
      }

      if (cursor.location === "pow") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.type === "pow") {
          const match = item.exp.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const ex = match[0];
            const rem = item.exp.slice(0, -ex.length);
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "pow" ? { ...i, exp: `${rem}(${ex})/()` } : i));
          } else {
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "pow" ? { ...i, exp: `${item.exp}()/()` } : i));
          }
          return;
        }
      }

      if (cursor.location === "abs") {
        const item = items.find((i) => i.id === cursor.itemId) as any;
        if (item && item.type === "abs") {
          const match = item.content.match(/([a-zA-Z0-9²³\.\^]+)$/);
          if (match) {
            const ex = match[0];
            const rem = item.content.slice(0, -ex.length);
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "abs" ? { ...i, content: `${rem}(${ex})/()` } : i));
          } else {
            setItems((prev) => prev.map((i) => i.id === cursor.itemId && i.type === "abs" ? { ...i, content: `${item.content}()/()` } : i));
          }
          return;
        }
      }

      if (cursor.location !== "main") {
        appendToken("/");
        return;
      }

      const { remainingItems, extracted } = extractTrailingNumber();
      const fracId = uid();
      const newFracItem: ExprItem = {
        id: fracId,
        type: "frac",
        num: extracted || "",
        den: "",
      };
      setItems([...remainingItems, newFracItem]);
      if (extracted) {
        setCursor({ location: "frac-den", itemId: fracId });
      } else {
        setCursor({ location: "frac-num", itemId: fracId });
      }
      return;
    }

    // ------------------------------------------------------------
    // 2. ROOT BUTTON (√■ / ³√■)
    // ------------------------------------------------------------
    if (action === "SQRT") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location !== "main") {
        appendToken(shift ? "³√(" : "√(");
        return;
      }
      const sqrtId = uid();
      const newSqrtItem: ExprItem = {
        id: sqrtId,
        type: "sqrt",
        root: shift ? 3 : 2,
        content: "",
      };
      setItems((prev) => [...prev, newSqrtItem]);
      setCursor({ location: "sqrt", itemId: sqrtId });
      return;
    }

    // ------------------------------------------------------------
    // 3. POWERS (x^■, x², x³) - Blank fill in if no number
    // ------------------------------------------------------------
    if (action === "POWER") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location !== "main") {
        appendToken("^(");
        return;
      }
      const { remainingItems, extracted } = extractTrailingNumber();
      const powId = uid();
      const newPowItem: ExprItem = {
        id: powId,
        type: "pow",
        base: extracted || "",
        exp: "",
      };
      setItems([...remainingItems, newPowItem]);
      if (extracted) {
        setCursor({ location: "pow", itemId: powId });
      } else {
        setCursor({ location: "pow-base", itemId: powId });
      }
      return;
    }

    if (action === "SQUARE") {
      if (hasCalculated) setHasCalculated(false);
      const expVal = shift ? "3" : "2";
      if (cursor.location !== "main") {
        appendToken(shift ? "³" : "²");
        return;
      }
      const { remainingItems, extracted } = extractTrailingNumber();
      const powId = uid();
      if (extracted) {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: extracted,
          exp: expVal,
        };
        setItems([...remainingItems, newPowItem]);
        setCursor({ location: "main", index: remainingItems.length + 1 });
      } else {
        // No preceding number: Blank fill-in base ■² with cursor in base!
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: "",
          exp: expVal,
        };
        setItems([...remainingItems, newPowItem]);
        setCursor({ location: "pow-base", itemId: powId });
      }
      return;
    }

    if (action === "CUBE") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location !== "main") {
        appendToken("³");
        return;
      }
      const { remainingItems, extracted } = extractTrailingNumber();
      const powId = uid();
      if (extracted) {
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: extracted,
          exp: "3",
        };
        setItems([...remainingItems, newPowItem]);
        setCursor({ location: "main", index: remainingItems.length + 1 });
      } else {
        // No preceding number: Blank fill-in base ■³ with cursor in base!
        const newPowItem: ExprItem = {
          id: powId,
          type: "pow",
          base: "",
          exp: "3",
        };
        setItems([...remainingItems, newPowItem]);
        setCursor({ location: "pow-base", itemId: powId });
      }
      return;
    }

    // ------------------------------------------------------------
    // 4. LOGARITHMS: 10^■ (POW_10), log_■■ (LOG_BASE), log (LOG)
    // ------------------------------------------------------------
    if (action === "POW_10") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location !== "main") {
        appendToken("10^(");
        return;
      }
      const powId = uid();
      const newPowItem: ExprItem = {
        id: powId,
        type: "pow",
        base: "10",
        exp: "",
      };
      setItems((prev) => [...prev, newPowItem]);
      setCursor({ location: "pow", itemId: powId });
      return;
    }

    if (action === "LOG_BASE") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location !== "main") {
        appendToken("log_(");
        return;
      }
      const logId = uid();
      const newLogItem: ExprItem = {
        id: logId,
        type: "logbase",
        base: "",
        arg: "",
      };
      setItems((prev) => [...prev, newLogItem]);
      setCursor({ location: "log-base", itemId: logId });
      return;
    }

    if (action === "LOG") {
      if (hasCalculated) setHasCalculated(false);
      if (shift) {
        handleButton("POW_10");
        return;
      }
      appendToken("log(");
      return;
    }

    // ------------------------------------------------------------
    // 5. ABS BUTTON (|x|)
    // ------------------------------------------------------------
    if (action === "ABS") {
      if (hasCalculated) setHasCalculated(false);
      if (cursor.location === "sqrt" || cursor.location === "frac-num" || cursor.location === "frac-den" || cursor.location === "pow") {
        appendToken("|");
        return;
      }
      if (cursor.location !== "main") {
        appendToken("|");
        return;
      }
      const absId = uid();
      const newAbsItem: ExprItem = {
        id: absId,
        type: "abs",
        content: "",
      };
      setItems((prev) => [...prev, newAbsItem]);
      setCursor({ location: "abs", itemId: absId });
      return;
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
        appendToken(action);
        break;
      case "(":
        if (cursor.location === "log-arg") {
          const it = items.find((i) => i.id === (cursor as any).itemId) as any;
          if (it && !it.arg) {
            // Already inside argument container
            return;
          }
        }
        appendToken("(");
        break;
      case ")":
        if (cursor.location === "pow") {
          const it = items.find((i) => i.id === (cursor as any).itemId) as any;
          if (it && it.type === "pow") {
            const depth = (it.exp.match(/\(/g) || []).length - (it.exp.match(/\)/g) || []).length;
            if (depth <= 0) {
              const idx = getItemIndex((cursor as any).itemId, items);
              setCursor({ location: "main", index: idx + 1 });
              return;
            }
          }
        }
        if (cursor.location === "log-base") {
          setCursor({ location: "log-arg", itemId: (cursor as any).itemId });
          return;
        }
        if (cursor.location === "log-arg") {
          const idx = getItemIndex((cursor as any).itemId, items);
          setCursor({ location: "main", index: idx + 1 });
          return;
        }
        appendToken(")");
        break;
      case ".":
        if (shift) {
          appendToken(String(Number(Math.random().toFixed(3))));
        } else if (alpha) {
          appendToken(String(Math.floor(Math.random() * 6) + 1));
        } else {
          appendToken(".");
        }
        break;
      case "+":
        appendToken(shift ? "Pol(" : "+");
        break;
      case "−":
        appendToken(shift ? "Rec(" : "−");
        break;
      case "×":
        appendToken(shift ? " P " : "×");
        break;
      case "÷":
        appendToken(shift ? " C " : "÷");
        break;
      case "NEG":
        appendToken("−");
        break;
      case "ANS":
        appendToken(shift ? "%" : "Ans");
        break;
      case "EXP":
        appendToken(shift ? "π" : alpha ? "e" : "×10^(");
        break;
      case "PI":
        appendToken("π");
        break;
      case "INV":
        appendToken(shift ? "!" : "^(-1)");
        break;
      case "SIN": {
        const token = shift ? "asin(" : "sin(";
        appendToken(token);
        break;
      }
      case "COS": {
        const token = shift ? "acos(" : "cos(";
        appendToken(token);
        break;
      }
      case "TAN": {
        const token = shift ? "atan(" : "tan(";
        appendToken(token);
        break;
      }
      case "LN":
        appendToken(shift ? "e^(" : "ln(");
        break;
      default:
        appendToken(action);
    }
  };

  // Expression Natural-V.P.A.M. Renderer with Radical Overbar & True Vertical Fractions
  const renderedNaturalExpression = useMemo(() => {
    const curIdx = cursor.location === "main" ? (cursor.index ?? items.length) : -1;

    if (items.length === 0) {
      return (
        <span
          onClick={() => setCursor({ location: "main", index: 0 })}
          className="opacity-40 flex items-center font-mono text-base cursor-text py-1"
        >
          0<span className="inline-block w-1.5 h-3.5 bg-[#121d12] animate-pulse ml-0.5" />
        </span>
      );
    }

    return (
      <span
        onClick={() => setCursor({ location: "main", index: items.length })}
        className="inline-flex items-center gap-0.5 flex-wrap font-mono py-1 cursor-text"
      >
        {curIdx === 0 && (
          <span className="inline-block w-1.5 h-3.5 bg-[#121d12] animate-pulse mr-0.5 align-middle" />
        )}
        {items.map((item, itemIdx) => {
          let node: React.ReactNode = null;

          // 1. Text item
          if (item.type === "text") {
            node = (
              <span
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCursor({ location: "main", index: itemIdx + 1 });
                }}
                className="text-xs sm:text-sm font-bold tracking-tight cursor-pointer"
              >
                {formatSubExpression(item.value)}
              </span>
            );
          }

          // 2. Square Root / Cube Root (Continuous Radical Overbar, exact digit height at rest!)
          if (item.type === "sqrt") {
            const isCursorInSqrt = cursor.location === "sqrt" && cursor.itemId === item.id;
            node = (
              <span
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCursor({ location: "sqrt", itemId: item.id });
                }}
                className="inline-flex items-stretch align-middle mx-0.5 font-mono cursor-pointer"
              >
                {/* Radical Symbol (√ or ³√) matches digit size at rest, seamlessly connects with overbar */}
                <span className="flex items-stretch shrink-0 select-none relative self-stretch">
                  {item.root === 3 && (
                    <span className="text-[7px] sm:text-[7.5px] font-black absolute -top-1 left-0 text-[#121d12] leading-none z-10 select-none">
                      3
                    </span>
                  )}
                  <svg
                    viewBox="0 0 8 16"
                    fill="none"
                    preserveAspectRatio="none"
                    className="w-1.5 sm:w-2 h-full text-[#121d12] shrink-0"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="miter"
                  >
                    <path d="M 0.5 8.5 L 2.2 14.8 L 7.2 0.65 L 8 0.65" />
                  </svg>
                </span>
                {/* Continuous Overbar with NO grey shaded box and minimal padding */}
                <span className="border-t-[1.3px] border-[#121d12] -ml-[0.5px] px-0.5 pt-0 pb-0 min-w-3 inline-flex items-center text-xs sm:text-sm font-bold rounded-tr-xs leading-none">
                  {formatSubExpression(item.content) || <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorInSqrt && (
                    <span className="inline-block w-1 h-3 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
              </span>
            );
          }

          // 3. Vertical Fraction
          if (item.type === "frac") {
            const isCursorNum = cursor.location === "frac-num" && cursor.itemId === item.id;
            const isCursorDen = cursor.location === "frac-den" && cursor.itemId === item.id;
            node = (
              <span
                key={item.id}
                className="inline-flex flex-col items-center justify-center leading-none align-middle mx-1 font-mono shrink-0 py-0.5"
              >
                {/* Numerator */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setCursor({ location: "frac-num", itemId: item.id });
                  }}
                  className="text-[10px] sm:text-[11px] border-b border-[#121d12] px-1 pb-0.5 text-center font-bold min-w-4 flex items-center justify-center leading-none cursor-pointer"
                >
                  {formatSubExpression(item.num) || <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorNum && (
                    <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
                {/* Denominator */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setCursor({ location: "frac-den", itemId: item.id });
                  }}
                  className="text-[10px] sm:text-[11px] px-1 pt-0.5 text-center font-bold min-w-4 flex items-center justify-center leading-none cursor-pointer"
                >
                  {formatSubExpression(item.den) || <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorDen && (
                    <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
              </span>
            );
          }

          // 3b. Mixed Fraction (Whole Number + Vertical Fraction)
          if (item.type === "mixed_frac") {
            const isCursorWhole = cursor.location === "mixed-whole" && cursor.itemId === item.id;
            const isCursorNum = cursor.location === "mixed-num" && cursor.itemId === item.id;
            const isCursorDen = cursor.location === "mixed-den" && cursor.itemId === item.id;
            node = (
              <span key={item.id} className="inline-flex items-center align-middle mx-1 font-mono shrink-0">
                {/* Whole number box */}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setCursor({ location: "mixed-whole", itemId: item.id });
                  }}
                  className="text-xs sm:text-sm font-bold min-w-3 text-center px-0.5 inline-flex items-center cursor-pointer"
                >
                  {item.whole ? formatSubExpression(item.whole) : <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorWhole && (
                    <span className="inline-block w-1 h-3 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
                {/* Fraction part */}
                <span className="inline-flex flex-col items-center justify-center leading-none align-middle mx-0.5 py-0.5">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursor({ location: "mixed-num", itemId: item.id });
                    }}
                    className="text-[10px] sm:text-[11px] border-b border-[#121d12] px-1 pb-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none cursor-pointer"
                  >
                    {formatSubExpression(item.num) || <span className="text-[#121d12]/40 select-none">■</span>}
                    {isCursorNum && (
                      <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                    )}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursor({ location: "mixed-den", itemId: item.id });
                    }}
                    className="text-[10px] sm:text-[11px] px-1 pt-0.5 text-center font-bold min-w-3 flex items-center justify-center leading-none cursor-pointer"
                  >
                    {formatSubExpression(item.den) || <span className="text-[#121d12]/40 select-none">■</span>}
                    {isCursorDen && (
                      <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                    )}
                  </span>
                </span>
              </span>
            );
          }

          // 4. Power (Elevated Superscript Box with Base Editing)
          if (item.type === "pow") {
            const isCursorBase = cursor.location === "pow-base" && cursor.itemId === item.id;
            const isCursorInPow = cursor.location === "pow" && cursor.itemId === item.id;
            node = (
              <span
                key={item.id}
                className="inline-flex items-baseline align-middle font-mono shrink-0"
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setCursor({ location: "pow-base", itemId: item.id });
                  }}
                  className="text-xs sm:text-sm font-bold min-w-3 inline-flex items-center cursor-pointer"
                >
                  {item.base ? formatSubExpression(item.base) : <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorBase && (
                    <span className="inline-block w-1 h-3 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
                <sup className="text-[10px] sm:text-[11px] font-black ml-0.5 -top-2 relative">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursor({ location: "pow", itemId: item.id });
                    }}
                    className={`px-0.5 py-0.2 rounded-xs min-w-3 inline-flex items-center cursor-pointer ${
                      isCursorInPow
                        ? "border border-[#121d12] bg-[#121d12]/10"
                        : "border-b border-transparent"
                    }`}
                  >
                    {item.exp ? formatSubExpression(item.exp) : <span className="text-[#121d12]/40 select-none">■</span>}
                    {isCursorInPow && (
                      <span className="inline-block w-1 h-2 bg-[#121d12] animate-pulse ml-0.5" />
                    )}
                  </span>
                </sup>
              </span>
            );
          }

          // 5. Custom Base Logarithm (log_■■)
          if (item.type === "logbase") {
            const isCursorBase = cursor.location === "log-base" && cursor.itemId === item.id;
            const isCursorArg = cursor.location === "log-arg" && cursor.itemId === item.id;
            node = (
              <span key={item.id} className="inline-flex items-baseline align-middle mx-0.5 font-mono font-bold shrink-0">
                <span className="text-xs sm:text-sm">log</span>
                <sub
                  onClick={(e) => {
                    e.stopPropagation();
                    setCursor({ location: "log-base", itemId: item.id });
                  }}
                  className="text-[9px] sm:text-[10px] top-1 relative px-0.5 min-w-2.5 inline-flex items-center cursor-pointer"
                >
                  <span className={`${isCursorBase ? "border border-[#121d12] bg-[#121d12]/10 px-0.5" : ""}`}>
                    {item.base || <span className="text-[#121d12]/40 select-none">■</span>}
                    {isCursorBase && (
                      <span className="inline-block w-1 h-2 bg-[#121d12] animate-pulse ml-0.5" />
                    )}
                  </span>
                </sub>
                <span className="text-xs sm:text-sm inline-flex items-center">
                  (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCursor({ location: "log-arg", itemId: item.id });
                    }}
                    className="px-0.5 min-w-2.5 inline-flex items-center cursor-pointer"
                  >
                    {item.arg ? formatSubExpression(item.arg) : <span className="text-[#121d12]/40 select-none">■</span>}
                    {isCursorArg && (
                      <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                    )}
                  </span>
                  )
                </span>
              </span>
            );
          }

          // 6. Absolute value |x|
          if (item.type === "abs") {
            const isCursorInAbs = cursor.location === "abs" && cursor.itemId === item.id;
            node = (
              <span
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCursor({ location: "abs", itemId: item.id });
                }}
                className="inline-flex items-center align-middle mx-1 font-mono font-bold text-xs sm:text-sm shrink-0 cursor-pointer"
              >
                <span>|</span>
                <span className="px-0.5 min-w-3 inline-flex items-center">
                  {item.content ? formatSubExpression(item.content) : <span className="text-[#121d12]/40 select-none">■</span>}
                  {isCursorInAbs && (
                    <span className="inline-block w-1 h-2.5 bg-[#121d12] animate-pulse ml-0.5" />
                  )}
                </span>
                <span>|</span>
              </span>
            );
          }

          return (
            <React.Fragment key={item.id}>
              {node}
              {curIdx === itemIdx + 1 && (
                <span className="inline-block w-1.5 h-3.5 bg-[#121d12] animate-pulse ml-0.5 align-middle" />
              )}
            </React.Fragment>
          );
        })}
      </span>
    );
  }, [items, cursor]);

  // Result Formatter that displays true Vertical Fractions (exact & mixed)!
  const renderedNaturalResult = useMemo(() => {
    if (lastNumericResult === null || result === "Math ERROR" || result === "Syntax ERROR") {
      return <span className="leading-none">{result}</span>;
    }

    if (displayMode === "pi") {
      const piFrac = toPiFraction(lastNumericResult);
      if (piFrac) {
        const isNeg = piFrac.num < 0;
        const absNum = Math.abs(piFrac.num);
        const den = piFrac.den;

        if (den === 1) {
          return (
            <span className="font-mono font-black text-[#121e12] leading-none py-0.5 text-lg sm:text-xl">
              {isNeg && "−"}{absNum === 1 ? "" : absNum}π
            </span>
          );
        }

        return (
          <div className="inline-flex items-center gap-1 font-mono font-black text-[#121e12] leading-none py-0.5">
            {isNeg && <span className="text-lg sm:text-xl mr-0.5 leading-none">−</span>}
            <div className="inline-flex flex-col items-center justify-center leading-none text-center">
              <span className="text-xs sm:text-sm border-b border-[#121e12] px-1.5 pb-0.5 font-black text-center w-full leading-none">
                {absNum === 1 ? "π" : `${absNum}π`}
              </span>
              <span className="text-xs sm:text-sm px-1.5 pt-0.5 font-black text-center w-full leading-none">
                {den}
              </span>
            </div>
          </div>
        );
      }
    }

    if (displayMode === "fraction" || displayMode === "mixed") {
      const frac = toFraction(lastNumericResult);
      if (frac && frac.den !== 1) {
        const isNeg = frac.num < 0;
        const absNum = Math.abs(frac.num);
        const den = frac.den;

        if (displayMode === "mixed" && absNum > den) {
          const whole = Math.floor(absNum / den);
          const rem = absNum % den;
          return (
            <div className="inline-flex items-center gap-1 font-mono font-black text-[#121e12] leading-none py-0.5">
              {isNeg && <span className="text-lg sm:text-xl mr-0.5 leading-none">−</span>}
              <span className="text-lg sm:text-xl mr-1 leading-none">{whole}</span>
              <div className="inline-flex flex-col items-center justify-center leading-none text-center">
                <span className="text-xs sm:text-sm border-b border-[#121e12] px-1.5 pb-0.5 font-black text-center w-full leading-none">
                  {rem}
                </span>
                <span className="text-xs sm:text-sm px-1.5 pt-0.5 font-black text-center w-full leading-none">
                  {den}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div className="inline-flex items-center gap-1 font-mono font-black text-[#121e12] leading-none py-0.5">
            {isNeg && <span className="text-lg sm:text-xl mr-0.5 leading-none">−</span>}
            <div className="inline-flex flex-col items-center justify-center leading-none text-center">
              <span className="text-xs sm:text-sm border-b border-[#121e12] px-1.5 pb-0.5 font-black text-center w-full leading-none">
                {absNum}
              </span>
              <span className="text-xs sm:text-sm px-1.5 pt-0.5 font-black text-center w-full leading-none">
                {den}
              </span>
            </div>
          </div>
        );
      }
    }

    return <span className="leading-none">{result}</span>;
  }, [result, lastNumericResult, displayMode]);

  const handleButtonRef = useRef(handleButton);
  handleButtonRef.current = handleButton;
  const handleNavRef = useRef(handleNav);
  handleNavRef.current = handleNav;

  // Dynamic Calculator Scale (Grow or Shrink)
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("casio_calculator_scale");
        if (saved) {
          const val = parseFloat(saved);
          if (!isNaN(val) && val >= 0.6 && val <= 1.6) return val;
        }
      } catch {}
    }
    return 1.0;
  });

  const updateScale = (newScale: number) => {
    const clamped = Math.min(1.6, Math.max(0.6, Number(newScale.toFixed(2))));
    setScale(clamped);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("casio_calculator_scale", String(clamped));
      } catch {}
    }
  };

  // Interactive Drag-to-Resize handler
  const isDraggingResizeRef = useRef(false);
  const dragStartRef = useRef({ startX: 0, startY: 0, startScale: 1 });

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    isDraggingResizeRef.current = true;
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScale: scale,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingResizeRef.current) return;
      const dx = moveEvent.clientX - dragStartRef.current.startX;
      const dy = moveEvent.clientY - dragStartRef.current.startY;
      const delta = (dx + dy) / 450;
      updateScale(dragStartRef.current.startScale + delta);
    };

    const handleMouseUp = () => {
      isDraggingResizeRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Physical Keyboard listener for instant, rock-solid arrow and number navigation + Zooming
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom in / Zoom out shortcuts (Ctrl + + / Ctrl + - / Ctrl + 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          updateScale(scale + 0.1);
          return;
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          updateScale(scale - 0.1);
          return;
        } else if (e.key === "0") {
          e.preventDefault();
          updateScale(1.0);
          return;
        }
      }

      // Don't intercept if an external text input or textarea is active
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl as HTMLElement).isContentEditable)
      ) {
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        handleNavRef.current("UP");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNavRef.current("DOWN");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleNavRef.current("LEFT");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNavRef.current("RIGHT");
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleButtonRef.current("=");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleButtonRef.current("DEL");
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleButtonRef.current("AC");
      } else if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        handleButtonRef.current(e.key);
      } else if (e.key === "+") {
        e.preventDefault();
        handleButtonRef.current("+");
      } else if (e.key === "-") {
        e.preventDefault();
        handleButtonRef.current("−");
      } else if (e.key === "*") {
        e.preventDefault();
        handleButtonRef.current("×");
      } else if (e.key === "/") {
        e.preventDefault();
        handleButtonRef.current("FRAC");
      } else if (e.key === "(" || e.key === ")") {
        e.preventDefault();
        handleButtonRef.current(e.key);
      } else if (e.key === "^") {
        e.preventDefault();
        handleButtonRef.current("POWER");
      } else if (e.key === ".") {
        e.preventDefault();
        handleButtonRef.current(".");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, scale]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-sm overflow-auto animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col items-center my-auto transition-transform"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Floating Top Controls */}
        <div className="flex items-center justify-between w-full max-w-[375px] mb-2 px-1 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            {/* Audio Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 border border-slate-700/60 shadow-xs transition-colors cursor-pointer text-[11px]"
              title={soundEnabled ? "Mute key clicks" : "Enable key clicks"}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-3 h-3 text-[#48A5EE]" />
                  <span>Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3 h-3 text-slate-400" />
                  <span>Muted</span>
                </>
              )}
            </button>

            {/* Scale / Zoom controls: Grow or Shrink */}
            <div className="inline-flex items-center bg-slate-800/90 border border-slate-700/60 rounded-full px-1.5 py-0.5 shadow-xs text-[11px] text-slate-300">
              <button
                onClick={() => updateScale(scale - 0.1)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-300 hover:text-white font-bold cursor-pointer active:scale-95 transition-all text-xs"
                title="Shrink calculator (Ctrl + -)"
              >
                −
              </button>
              <button
                onClick={() => updateScale(1.0)}
                className="px-1.5 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
                title="Click to reset size to 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                onClick={() => updateScale(scale + 0.1)}
                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-300 hover:text-white font-bold cursor-pointer active:scale-95 transition-all text-xs"
                title="Grow calculator (Ctrl + +)"
              >
                +
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/90 hover:bg-red-900/60 text-slate-300 hover:text-red-200 border border-slate-700/60 transition-colors cursor-pointer text-[11px]"
            title="Close calculator (Esc)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Close (Esc)</span>
          </button>
        </div>

        {/* ============================================================ */}
        {/* REAL CASIO FX-83GT X CLASSWIZ EXACT HARDWARE REPLICA        */}
        {/* ============================================================ */}
        <div
          className="relative w-[345px] sm:w-[375px] rounded-[36px] bg-[#161c24] p-3 sm:p-3.5 text-slate-100 flex flex-col items-center select-none border-4 border-[#242e3d] shrink-0"
          style={{
            boxShadow: `
              0 30px 70px -10px rgba(0,0,0,0.95),
              0 0 0 1px rgba(255,255,255,0.08),
              inset 0 2px 3px rgba(255,255,255,0.15),
              inset 0 -4px 10px rgba(0,0,0,0.85)
            `,
          }}
        >
          {/* External Hard Shell Cradle Lip */}
          <div className="absolute -inset-1 rounded-[38px] border-2 border-[#1e2735] pointer-events-none -z-10 shadow-2xl" />

          {/* ============================================================ */}
          {/* ACRYLIC DISPLAY WINDOW WITH CASIO & CLASSWIZ BRANDING       */}
          {/* ============================================================ */}
          <div
            className="w-full rounded-2xl bg-[#0f1318] p-2.5 pb-2 border border-[#2c3746] relative shadow-lg overflow-hidden mb-2 shrink-0"
            style={{
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.6)",
            }}
          >
            {/* Top Brand Header */}
            <div className="flex items-center justify-between px-1 pb-1">
              <span className="font-extrabold tracking-widest text-sm text-slate-100 font-sans">
                CASIO
              </span>
              <span className="text-xs font-black tracking-tight text-slate-200 font-sans">
                fx-83GT <span className="text-white font-extrabold">X</span>
              </span>
            </div>

            {/* Neon Pink CLASSWIZ Brand Logo */}
            <div className="text-center py-0.5">
              <span className="text-[11px] font-black uppercase text-[#fb7185] tracking-[0.25em] font-sans drop-shadow-xs">
                CLASSWIZ
              </span>
            </div>

            {/* ============================================================ */}
            {/* NATURAL-V.P.A.M. 2-LINE LCD DOT MATRIX DISPLAY (FIXED SIZE)  */}
            {/* ============================================================ */}
            <div
              className="w-full h-[118px] sm:h-[124px] max-h-[118px] sm:max-h-[124px] rounded-lg p-2 font-mono relative overflow-hidden border border-[#4b5945] flex flex-col justify-between select-none shrink-0"
              style={{
                backgroundColor: "#9baa8e",
                color: "#121d12",
                boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.6), inset -1px -1px 2px rgba(255,255,255,0.25)",
              }}
            >
              {/* Status Flags Header */}
              <div className="h-[14px] shrink-0 flex items-center justify-between text-[8px] font-black tracking-widest border-b border-[#89997c] pb-0.5 opacity-95">
                <div className="flex items-center gap-1.5">
                  <span className={`px-0.5 rounded-xs ${isShiftActive ? "bg-[#121d12] text-[#9baa8e]" : "opacity-20"}`}>
                    S
                  </span>
                  <span className={`px-0.5 rounded-xs ${isAlphaActive ? "bg-[#121d12] text-[#9baa8e]" : "opacity-20"}`}>
                    A
                  </span>
                  <span className={`px-0.5 rounded-xs ${memory !== 0 ? "opacity-100 font-black" : "opacity-20"}`}>
                    M
                  </span>
                  <span className={`px-0.5 rounded-xs ${displayMode === "fraction" || displayMode === "mixed" || displayMode === "pi" ? "opacity-100 font-black" : "opacity-20"}`}>
                    ■/■
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleButton("MODE_TOGGLE")}
                    className="hover:underline cursor-pointer font-black px-1 rounded-xs bg-[#121d12]/10"
                    title="Toggle DEG / RAD"
                  >
                    [{angleMode}]
                  </button>
                  <span className="opacity-90 font-bold">Math▲▼</span>
                </div>
              </div>

              {/* Upper Natural Expression Line (Locked fixed height: fractions never resize screen!) */}
              <div className="h-[48px] sm:h-[50px] shrink-0 flex items-center justify-start text-xs sm:text-sm tracking-wide overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none">
                {optnMessage ? (
                  <span className="text-[11px] font-bold text-[#121d12] bg-[#121d12]/10 px-1 rounded-xs">
                    {optnMessage}
                  </span>
                ) : (
                  renderedNaturalExpression
                )}
              </div>

              {/* Lower Natural Result Line (Locked fixed height: never changes screen size!) */}
              <div className="h-[38px] sm:h-[42px] shrink-0 flex items-center justify-end text-xl sm:text-2xl font-black tracking-tight overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none">
                {renderedNaturalResult}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* CHEVRON HERRINGBONE TEXTURED FRONT KEYPAD CHASSIS           */}
          {/* ============================================================ */}
          <div
            className="w-full pt-1 pb-1 px-1 rounded-2xl relative"
            style={{
              backgroundImage: `
                repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 6px),
                repeating-linear-gradient(-45deg, rgba(255,255,255,0.025) 0px, rgba(255,255,255,0.025) 2px, transparent 2px, transparent 6px)
              `,
            }}
          >
            {/* ============================================================ */}
            {/* UPPER KEYPAD BLOCK: REAL-LIFE CASIO CLASSWIZ ARCHITECTURE    */}
            {/* Left: SHIFT/ALPHA & OPTN/x³ | Center: REPLAY | Right: MENU/ON & Abs/log_■ */}
            {/* ============================================================ */}
            {/* ============================================================ */}
            {/* UPPER KEYPAD BLOCK: REAL-LIFE CASIO CLASSWIZ ARCHITECTURE    */}
            {/* Exactly 6 columns matching lower rows:                       */}
            {/* Col 1: SHIFT / OPTN                                         */}
            {/* Col 2: ALPHA / x³                                           */}
            {/* Col 3-4: Authentic Faceted REPLAY Rocker                    */}
            {/* Col 5: MENU / Abs                                          */}
            {/* Col 6: ON / log_■■                                          */}
            {/* ============================================================ */}
            <div className="grid grid-cols-6 gap-1 mb-2 items-center">
              {/* Col 1: SHIFT (top) & OPTN (bottom) */}
              <div className="col-span-1 flex flex-col justify-between items-center h-[76px]">
                {/* SHIFT */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7.5px] font-black text-[#eab308] leading-none mb-0.5 tracking-tight">
                    SHIFT
                  </span>
                  <button
                    onClick={() => handleButton("SHIFT")}
                    className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-slate-600 transition-all cursor-pointer shadow-md flex items-center justify-center active:scale-95 ${
                      isShiftActive
                        ? "bg-[#eab308] text-slate-950 border-amber-300 ring-2 ring-amber-400"
                        : "bg-linear-to-b from-[#323946] to-[#1d222b] text-slate-300 hover:from-[#3c4453] hover:to-[#222833]"
                    }`}
                    title="Shift"
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  </button>
                </div>

                {/* OPTN (pushed to the side, directly above ■/■) */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7px] font-black text-[#eab308] h-2 leading-none">QR</span>
                  <button
                    onClick={() => handleButton("OPTN")}
                    className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[11px] font-black"
                    title="Options / Quick Info"
                  >
                    OPTN
                  </button>
                </div>
              </div>

              {/* Col 2: ALPHA (top) & x³ (bottom) */}
              <div className="col-span-1 flex flex-col justify-between items-center h-[76px]">
                {/* ALPHA */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7.5px] font-black text-[#fb7185] leading-none mb-0.5 tracking-tight">
                    ALPHA
                  </span>
                  <button
                    onClick={() => handleButton("ALPHA")}
                    className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full border border-slate-600 transition-all cursor-pointer shadow-md flex items-center justify-center active:scale-95 ${
                      isAlphaActive
                        ? "bg-[#fb7185] text-white border-rose-400 ring-2 ring-rose-400"
                        : "bg-linear-to-b from-[#323946] to-[#1d222b] text-slate-300 hover:from-[#3c4453] hover:to-[#222833]"
                    }`}
                    title="Alpha"
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  </button>
                </div>

                {/* x³ (pushed to the side, directly above √■) */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7px] font-black text-[#fb7185] h-2 leading-none">:</span>
                  <button
                    onClick={() => handleButton("CUBE")}
                    className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[11px] font-bold"
                    title="Cube x³"
                  >
                    x³
                  </button>
                </div>
              </div>

              {/* Col 3 & 4: AUTHENTIC REAL-LIFE CASIO CLASSWIZ DIRECTIONAL ROCKER */}
              <div className="col-span-2 flex items-center justify-center h-[76px] px-0.5">
                <svg
                  viewBox="0 0 130 84"
                  className="w-full max-w-[118px] sm:max-w-[126px] h-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.9)] select-none"
                >
                  <defs>
                    {/* Bezel Outer Stroke Gradient */}
                    <linearGradient id="casioRockerBezelBorder" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#3d4a5c" />
                      <stop offset="50%" stopColor="#222b37" />
                      <stop offset="100%" stopColor="#10151c" />
                    </linearGradient>

                    {/* Bezel Inner Cavity Gradient */}
                    <radialGradient id="casioRockerBezelCavity" cx="50%" cy="50%" r="50%">
                      <stop offset="60%" stopColor="#080b0f" />
                      <stop offset="100%" stopColor="#040608" />
                    </radialGradient>

                    {/* Top Button - Left Facet Highlight */}
                    <linearGradient id="casioTopFacetLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3e4a5d" />
                      <stop offset="60%" stopColor="#252f3d" />
                      <stop offset="100%" stopColor="#171d26" />
                    </linearGradient>

                    {/* Top Button - Right Facet Shaded */}
                    <linearGradient id="casioTopFacetRight" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#283342" />
                      <stop offset="60%" stopColor="#1b222d" />
                      <stop offset="100%" stopColor="#10151c" />
                    </linearGradient>

                    {/* Bottom Button - Left Facet */}
                    <linearGradient id="casioBotFacetLeft" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#354152" />
                      <stop offset="60%" stopColor="#212a36" />
                      <stop offset="100%" stopColor="#141a22" />
                    </linearGradient>

                    {/* Bottom Button - Right Facet */}
                    <linearGradient id="casioBotFacetRight" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#242d3a" />
                      <stop offset="60%" stopColor="#181e27" />
                      <stop offset="100%" stopColor="#0e1218" />
                    </linearGradient>

                    {/* Left Button Gradient */}
                    <linearGradient id="casioLeftButtonGrad" x1="0%" y1="30%" x2="100%" y2="70%">
                      <stop offset="0%" stopColor="#3a475a" />
                      <stop offset="40%" stopColor="#252f3e" />
                      <stop offset="100%" stopColor="#131921" />
                    </linearGradient>

                    {/* Right Button Gradient */}
                    <linearGradient id="casioRightButtonGrad" x1="100%" y1="30%" x2="0%" y2="70%">
                      <stop offset="0%" stopColor="#2c3645" />
                      <stop offset="40%" stopColor="#1e2633" />
                      <stop offset="100%" stopColor="#11161d" />
                    </linearGradient>

                    {/* Center Hub Dish Gradient */}
                    <radialGradient id="casioCenterHubGrad" cx="45%" cy="40%" r="55%">
                      <stop offset="0%" stopColor="#273241" />
                      <stop offset="60%" stopColor="#151b24" />
                      <stop offset="100%" stopColor="#0d1117" />
                    </radialGradient>
                  </defs>

                  {/* 1. Recessed Diamond/Hexagon Bezel Outer Lip */}
                  <path
                    d="M 65 6 C 76 6 86 8 95 13 L 118 36 C 124 40 124 44 118 48 L 95 71 C 86 76 76 78 65 78 C 54 78 44 76 35 71 L 12 48 C 6 44 6 40 12 36 L 35 13 C 44 8 54 6 65 6 Z"
                    fill="url(#casioRockerBezelCavity)"
                    stroke="url(#casioRockerBezelBorder)"
                    strokeWidth="2.5"
                  />

                  {/* 2. Top Button (UP) - Faceted Arched Wedge */}
                  <g
                    onClick={() => handleNav("UP")}
                    className="cursor-pointer transition-all duration-100 hover:brightness-125 active:scale-[0.98] group"
                    role="button"
                    aria-label="Up"
                  >
                    {/* Left Facet */}
                    <path
                      d="M 42 24 C 50 17 58 13 65 13 L 65 31 C 61 31 58 33 56 35 Z"
                      fill="url(#casioTopFacetLeft)"
                      stroke="#475569"
                      strokeWidth="0.6"
                    />
                    {/* Right Facet */}
                    <path
                      d="M 65 13 C 72 13 80 17 88 24 L 74 35 C 72 33 69 31 65 31 Z"
                      fill="url(#casioTopFacetRight)"
                      stroke="#334155"
                      strokeWidth="0.6"
                    />
                    {/* Central Facet Ridge Highlight */}
                    <line x1="65" y1="13" x2="65" y2="31" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
                    {/* Molded Triangle Arrow */}
                    <polygon points="65,18 69,24 61,24" fill="rgba(255,255,255,0.75)" />
                  </g>

                  {/* 3. Bottom Button (DOWN) - Faceted Arched Wedge */}
                  <g
                    onClick={() => handleNav("DOWN")}
                    className="cursor-pointer transition-all duration-100 hover:brightness-125 active:scale-[0.98] group"
                    role="button"
                    aria-label="Down"
                  >
                    {/* Left Facet */}
                    <path
                      d="M 42 60 C 50 67 58 71 65 71 L 65 53 C 61 53 58 51 56 49 Z"
                      fill="url(#casioBotFacetLeft)"
                      stroke="#3d4b5c"
                      strokeWidth="0.6"
                    />
                    {/* Right Facet */}
                    <path
                      d="M 65 71 C 72 71 80 67 88 60 L 74 49 C 72 51 69 53 65 53 Z"
                      fill="url(#casioBotFacetRight)"
                      stroke="#2c3645"
                      strokeWidth="0.6"
                    />
                    {/* Central Facet Ridge Highlight */}
                    <line x1="65" y1="53" x2="65" y2="71" stroke="rgba(255,255,255,0.3)" strokeWidth="0.8" />
                    {/* Molded Triangle Arrow */}
                    <polygon points="65,66 69,60 61,60" fill="rgba(255,255,255,0.75)" />
                  </g>

                  {/* 4. Left Button (LEFT) - Rounded Wing */}
                  <g
                    onClick={() => handleNav("LEFT")}
                    className="cursor-pointer transition-all duration-100 hover:brightness-125 active:scale-[0.98] group"
                    role="button"
                    aria-label="Left"
                  >
                    <path
                      d="M 40 25 C 28 32 14 39 14 42 C 14 45 28 52 40 59 L 54 48 C 53 45 53 39 54 36 Z"
                      fill="url(#casioLeftButtonGrad)"
                      stroke="#414f63"
                      strokeWidth="0.6"
                    />
                    {/* Molded Triangle Arrow */}
                    <polygon points="27,42 33,38 33,46" fill="rgba(255,255,255,0.75)" />
                  </g>

                  {/* 5. Right Button (RIGHT) - Rounded Wing */}
                  <g
                    onClick={() => handleNav("RIGHT")}
                    className="cursor-pointer transition-all duration-100 hover:brightness-125 active:scale-[0.98] group"
                    role="button"
                    aria-label="Right"
                  >
                    <path
                      d="M 90 25 C 102 32 116 39 116 42 C 116 45 102 52 90 59 L 76 48 C 77 45 77 39 76 36 Z"
                      fill="url(#casioRightButtonGrad)"
                      stroke="#364354"
                      strokeWidth="0.6"
                    />
                    {/* Molded Triangle Arrow */}
                    <polygon points="103,42 97,38 97,46" fill="rgba(255,255,255,0.75)" />
                  </g>

                  {/* 6. Central Concave Dish Hub */}
                  <circle
                    cx="65"
                    cy="42"
                    r="11"
                    fill="url(#casioCenterHubGrad)"
                    stroke="#3b4859"
                    strokeWidth="1.2"
                    className="pointer-events-none"
                  />
                  {/* Specular Edge Highlight */}
                  <ellipse
                    cx="65"
                    cy="40.5"
                    rx="8"
                    ry="6"
                    fill="none"
                    stroke="rgba(255,255,255,0.14)"
                    strokeWidth="0.8"
                    className="pointer-events-none"
                  />
                  {/* Center Dimple Dot */}
                  <circle cx="65" cy="42" r="2.5" fill="#080b0f" stroke="#2a3543" strokeWidth="0.6" className="pointer-events-none" />
                </svg>
              </div>

              {/* Col 5: MENU / SETUP (top) & Abs (bottom) */}
              <div className="col-span-1 flex flex-col justify-between items-center h-[76px]">
                {/* MENU / SETUP */}
                <div className="flex flex-col items-center w-full">
                  <div className="flex items-center gap-0.5 text-[7px] leading-none mb-0.5">
                    <span className="text-slate-300 font-bold">MENU</span>
                    <span className="text-[#eab308] font-black">SETUP</span>
                  </div>
                  <button
                    onClick={() => handleButton("MODE_TOGGLE")}
                    className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-linear-to-b from-[#323946] to-[#1d222b] hover:from-[#3c4453] hover:to-[#222833] border border-slate-600 transition-all cursor-pointer shadow-md flex items-center justify-center active:scale-95"
                    title="Menu / Angle Mode"
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  </button>
                </div>

                {/* Abs (pushed to the side, directly above log) */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7px] font-black text-[#eab308] h-2 leading-none">Abs</span>
                  <button
                    onClick={() => handleButton("ABS")}
                    className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[11px] font-bold"
                    title="Absolute Value Abs(x)"
                  >
                    Abs
                  </button>
                </div>
              </div>

              {/* Col 6: ON (top) & log_■■ (bottom) */}
              <div className="col-span-1 flex flex-col justify-between items-center h-[76px]">
                {/* ON */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7.5px] font-bold text-slate-300 leading-none mb-0.5 tracking-tight">
                    ON
                  </span>
                  <button
                    onClick={() => handleButton("ON")}
                    className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-linear-to-b from-[#323946] to-[#1d222b] hover:from-[#3c4453] hover:to-[#222833] border border-slate-600 transition-all cursor-pointer shadow-md flex items-center justify-center active:scale-95"
                    title="Power ON / Reset"
                  >
                    <div className="w-4 h-4 rounded-full border border-white/20" />
                  </button>
                </div>

                {/* log_■■ (pushed to the side, directly above ln) */}
                <div className="flex flex-col items-center w-full">
                  <span className="text-[7px] font-black text-[#eab308] h-2 leading-none">log_a</span>
                  <button
                    onClick={() => handleButton("LOG_BASE")}
                    className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[10px] font-black"
                    title="Logarithm with custom base"
                  >
                    log_■■
                  </button>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FUNCTION KEYS ROW 2: ■/■, √■, x², x^■, log, ln               */}
            {/* ------------------------------------------------------------ */}
            <div className="grid grid-cols-6 gap-1 mb-1.5 text-[11px] font-bold">
              {/* ■/■ (Fraction) & Shift: ■■/■ (Mixed Fraction) */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleButton("MIXED_FRAC")}
                  className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center hover:underline cursor-pointer"
                  title="Mixed Fraction (■ ■/■)"
                >
                  ■■/■
                </button>
                <button
                  onClick={() => handleButton(isShiftActive ? "MIXED_FRAC" : "FRAC")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Vertical Fraction (■/■, Shift: ■■/■)"
                >
                  {isShiftActive ? "■■/■" : "■/■"}
                </button>
              </div>

              {/* √■ (Overbar encompasses!) */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">³√■</span>
                <button
                  onClick={() => handleButton("SQRT")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Square Root (Overbar encompasses, use ▶ to exit)"
                >
                  {isShiftActive ? "³√" : "√■"}
                </button>
              </div>

              {/* x² */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">i</span>
                <button
                  onClick={() => handleButton("SQUARE")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Square x²"
                >
                  {isShiftActive ? "x³" : "x²"}
                </button>
              </div>

              {/* x^■ (Superscript box, use ▶ to drop to baseline) */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">■√■</span>
                <button
                  onClick={() => handleButton("POWER")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Power x^■ (use ▶ to drop to baseline)"
                >
                  x^■
                </button>
              </div>

              {/* log & 10^■ */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => handleButton("POW_10")}
                  className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center hover:underline cursor-pointer"
                  title="10 to a power (10^■)"
                >
                  10^■
                </button>
                <button
                  onClick={() => handleButton(isShiftActive ? "POW_10" : "LOG")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Logarithm (Shift: 10^■)"
                >
                  {isShiftActive ? "10^■" : "log"}
                </button>
              </div>

              {/* ln */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">e^■</span>
                <button
                  onClick={() => handleButton("LN")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Natural Logarithm (ln)"
                >
                  {isShiftActive ? "e^" : "ln"}
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FUNCTION KEYS ROW 3: (-), °'", x⁻¹, sin, cos, tan           */}
            {/* ------------------------------------------------------------ */}
            <div className="grid grid-cols-6 gap-1 mb-1.5 text-[11px] font-bold">
              {/* (-) */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#fb7185] h-2.5 flex items-center">A</span>
                <button
                  onClick={() => handleButton("NEG")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Negation (−)"
                >
                  (−)
                </button>
              </div>

              {/* ° ' " */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">FACT</span>
                <button
                  onClick={() => handleButton("DMS")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Degrees, Minutes, Seconds"
                >
                  ° ' "
                </button>
              </div>

              {/* x⁻¹ */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">x!</span>
                <button
                  onClick={() => handleButton("INV")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Reciprocal x⁻¹ (Shift: x!)"
                >
                  {isShiftActive ? "x!" : "x⁻¹"}
                </button>
              </div>

              {/* sin */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">sin⁻¹</span>
                <button
                  onClick={() => handleButton("SIN")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Sine (Shift: sin⁻¹)"
                >
                  {isShiftActive ? "sin⁻¹" : "sin"}
                </button>
              </div>

              {/* cos */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">cos⁻¹</span>
                <button
                  onClick={() => handleButton("COS")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Cosine (Shift: cos⁻¹)"
                >
                  {isShiftActive ? "cos⁻¹" : "cos"}
                </button>
              </div>

              {/* tan */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">tan⁻¹</span>
                <button
                  onClick={() => handleButton("TAN")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                  title="Tangent (Shift: tan⁻¹)"
                >
                  {isShiftActive ? "tan⁻¹" : "tan"}
                </button>
              </div>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* FUNCTION KEYS ROW 4: STO, ENG, (, ), S<=>D, M+               */}
            {/* ------------------------------------------------------------ */}
            <div className="grid grid-cols-6 gap-1 mb-2 text-[11px] font-bold">
              {/* STO */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">RECALL</span>
                <button
                  onClick={() => handleButton("STO")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[10px]"
                  title="Store to M (Shift: Recall)"
                >
                  STO
                </button>
              </div>

              {/* ENG */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">←</span>
                <button
                  onClick={() => handleButton("ENG")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[10px]"
                  title="Engineering Notation"
                >
                  ENG
                </button>
              </div>

              {/* ( */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">,</span>
                <button
                  onClick={() => handleButton("(")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                >
                  (
                </button>
              </div>

              {/* ) */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#fb7185] h-2.5 flex items-center">x</span>
                <button
                  onClick={() => handleButton(")")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer"
                >
                  )
                </button>
              </div>

              {/* S <=> D */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center tracking-tighter">
                  a b/c⇔d/c
                </span>
                <button
                  onClick={() => handleButton("S_TO_D")}
                  className={`w-full py-1 rounded-md border font-black text-[10px] transition-all shadow-xs active:translate-y-[1px] cursor-pointer ${
                    displayMode === "fraction" || displayMode === "mixed" || displayMode === "pi"
                      ? "bg-[#38bdf8] text-slate-950 border-sky-300 font-extrabold"
                      : "bg-[#242a35] hover:bg-[#2e3644] text-[#38bdf8] border-slate-600/80"
                  }`}
                  title="Toggle Fraction / Decimal (S ⇔ D)"
                >
                  S⇔D
                </button>
              </div>

              {/* M+ */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2.5 flex items-center">M-</span>
                <button
                  onClick={() => handleButton("M_PLUS")}
                  className="w-full py-1 rounded-md bg-[#242a35] hover:bg-[#2e3644] border border-slate-600/80 text-slate-100 shadow-xs active:translate-y-[1px] cursor-pointer text-[10px]"
                  title="Memory M+ (Shift: M-)"
                >
                  M+
                </button>
              </div>
            </div>

            {/* ============================================================ */}
            {/* PRIMARY NUMERIC KEYPAD WITH EXACT GOLDEN-YELLOW DEL & AC     */}
            {/* ============================================================ */}
            <div className="w-full grid grid-cols-5 gap-1.5">
              {/* Row 1: 7, 8, 9, DEL (GOLDEN YELLOW), AC (GOLDEN YELLOW) */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2 flex items-center">CONST</span>
                <button
                  onClick={() => handleButton("7")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  7
                </button>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2 flex items-center">CONV</span>
                <button
                  onClick={() => handleButton("8")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  8
                </button>
              </div>

              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2 flex items-center">RESET</span>
                <button
                  onClick={() => handleButton("9")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  9
                </button>
              </div>

              {/* DEL - EXACT CASIO GOLDEN YELLOW KEYCAP WITH BOLD BLACK TEXT */}
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-0.5 text-[6.5px] h-2">
                  <span className="text-[#eab308] font-black">INS</span>
                  <span className="text-[#fb7185] font-black">UNDO</span>
                </div>
                <button
                  onClick={() => handleButton("DEL")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black text-xs border-t border-amber-200 shadow-[0_3px_0_#92400e] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                  title="Delete (Backspace)"
                >
                  DEL
                </button>
              </div>

              {/* AC - EXACT CASIO GOLDEN YELLOW KEYCAP WITH BOLD BLACK TEXT */}
              <div className="flex flex-col items-center">
                <span className="text-[7px] font-bold text-[#eab308] h-2 flex items-center">OFF</span>
                <button
                  onClick={() => handleButton("AC")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-black text-xs border-t border-amber-200 shadow-[0_3px_0_#92400e] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                  title="All Clear (Esc)"
                >
                  AC
                </button>
              </div>

              {/* Row 2: 4, 5, 6, × (nPr), ÷ (nCr) */}
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("4")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  4
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("5")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  5
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("6")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  6
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">nPr</span>
                <button
                  onClick={() => handleButton("×")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-extrabold text-sm border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">nCr</span>
                <button
                  onClick={() => handleButton("÷")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-extrabold text-sm border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  ÷
                </button>
              </div>

              {/* Row 3: 1, 2, 3, + (Pol), − (Rec) */}
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("1")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  1
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("2")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  2
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <button
                  onClick={() => handleButton("3")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  3
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">Pol</span>
                <button
                  onClick={() => handleButton("+")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-extrabold text-sm border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  +
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">Rec</span>
                <button
                  onClick={() => handleButton("−")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-extrabold text-sm border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  −
                </button>
              </div>

              {/* Row 4: 0, •, ×10ˣ, Ans, = (ALL EXACT SAME SIZE!) */}
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">Rnd</span>
                <button
                  onClick={() => handleButton("0")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  0
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <div className="flex items-center gap-0.5 text-[6.5px] -mt-2 mb-0.5 leading-none">
                  <span className="text-[#eab308] font-bold">Ran#</span>
                  <span className="text-[#fb7185] font-bold">RanInt</span>
                </div>
                <button
                  onClick={() => handleButton(".")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#272e3a] hover:bg-[#313948] text-white font-black text-sm border-t border-white/20 shadow-[0_3px_0_#0d1117] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                >
                  •
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <div className="flex items-center gap-0.5 text-[6.5px] -mt-2 mb-0.5 leading-none">
                  <span className="text-[#eab308] font-bold">π</span>
                  <span className="text-[#fb7185] font-bold">e</span>
                </div>
                <button
                  onClick={() => handleButton("EXP")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-200 font-black text-xs border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                  title="Scientific Standard Form (×10ˣ, Shift: π, Alpha: e)"
                >
                  ×10ˣ
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">%</span>
                <button
                  onClick={() => handleButton("ANS")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-black text-xs border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                  title="Answer memory (Ans, Shift: %)"
                >
                  Ans
                </button>
              </div>
              <div className="flex flex-col items-center mt-1">
                <span className="text-[7px] font-bold text-[#eab308] -mt-2 mb-0.5 leading-none">≈</span>
                <button
                  onClick={() => handleButton("=")}
                  className="w-full h-9 sm:h-10 rounded-lg bg-[#1e242e] hover:bg-[#28303d] text-slate-100 font-black text-sm border-t border-white/10 shadow-[0_3px_0_#0a0e14] active:translate-y-[2px] active:shadow-none transition-transform cursor-pointer flex items-center justify-center leading-none"
                  title="Calculate (= or Enter)"
                >
                  =
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Curved Chin Accent */}
          <div className="w-full pt-2 pb-0.5 flex items-center justify-center opacity-30">
            <div className="w-20 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Interactive Drag-to-Resize Corner Grip Handle */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute -bottom-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-800/95 hover:bg-[#3b82f6] text-slate-400 hover:text-white border border-slate-600/90 shadow-2xl flex items-center justify-center cursor-nwse-resize select-none transition-colors group z-40"
            title="Click & drag to grow or shrink calculator"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"
            >
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
