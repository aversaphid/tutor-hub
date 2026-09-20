/**
 * Casio fx-83GT X ClassWiz Math Engine & Parser
 * 100% Client-Side Evaluation Engine
 */

export type ExprItem =
  | { id: string; type: "text"; value: string }
  | { id: string; type: "sqrt"; root: 2 | 3; content: string }
  | { id: string; type: "frac"; num: string; den: string }
  | { id: string; type: "mixed_frac"; whole: string; num: string; den: string }
  | { id: string; type: "pow"; base: string; exp: string }
  | { id: string; type: "logbase"; base: string; arg: string }
  | { id: string; type: "abs"; content: string };

export function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  if (n > 170) return Infinity;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
}

export function nPr(n: number, r: number): number {
  if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  return factorial(n) / factorial(n - r);
}

export function nCr(n: number, r: number): number {
  if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

// Convert decimal to simplified fraction (for S <=> D button)
export function toFraction(val: number): { num: number; den: number } | null {
  if (!isFinite(val) || isNaN(val) || Math.abs(val) > 100000) return null;
  const sign = val < 0 ? -1 : 1;
  const absVal = Math.abs(val);

  if (Number.isInteger(absVal)) {
    return { num: sign * absVal, den: 1 };
  }

  const maxDenominator = 10000;
  let bestNumerator = 1;
  let bestDenominator = 1;
  let minError = Math.abs(absVal - bestNumerator / bestDenominator);

  let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
  let b = absVal;

  for (let i = 0; i < 15; i++) {
    const a = Math.floor(b);
    const auxH = a * h1 + h2;
    const auxK = a * k1 + k2;

    if (auxK > maxDenominator) break;

    h2 = h1;
    h1 = auxH;
    k2 = k1;
    k1 = auxK;

    const error = Math.abs(absVal - h1 / k1);
    if (error < minError) {
      minError = error;
      bestNumerator = h1;
      bestDenominator = k1;
    }

    if (error < 1e-9) break;
    const diff = b - a;
    if (diff < 1e-12) break;
    b = 1 / diff;
  }

  if (minError < 1e-6) {
    return { num: sign * bestNumerator, den: bestDenominator };
  }

  return null;
}

// Automatically balance unclosed parentheses (e.g. "log(100" -> "log(100)")
export function balanceParentheses(expr: string): string {
  let depth = 0;
  for (const char of expr) {
    if (char === "(") depth++;
    else if (char === ")") depth = Math.max(0, depth - 1);
  }
  return expr + ")".repeat(depth);
}

// Convert item list into math string for evaluation
export function serializeToMath(itemList: ExprItem[]): string {
  return itemList
    .map((item) => {
      if (item.type === "text") {
        return item.value;
      }
      if (item.type === "sqrt") {
        const content = item.content.trim() || "0";
        const fn = item.root === 3 ? "cbrt" : "sqrt";
        return `${fn}(${balanceParentheses(content)})`;
      }
      if (item.type === "frac") {
        const num = item.num.trim() || "0";
        const den = item.den.trim() || "1";
        return `((${balanceParentheses(num)})/(${balanceParentheses(den)}))`;
      }
      if (item.type === "mixed_frac") {
        const whole = item.whole.trim() || "0";
        const num = item.num.trim() || "0";
        const den = item.den.trim() || "1";
        return `((${balanceParentheses(whole)}) + (${balanceParentheses(num)})/(${balanceParentheses(den)}))`;
      }
      if (item.type === "pow") {
        const base = item.base.trim() || "0";
        const exp = item.exp.trim() || "1";
        return `((${balanceParentheses(base)})**(${balanceParentheses(exp)}))`;
      }
      if (item.type === "logbase") {
        const base = item.base.trim() || "10";
        const arg = item.arg.trim() || "1";
        return `(log(${balanceParentheses(arg)})/log(${balanceParentheses(base)}))`;
      }
      if (item.type === "abs") {
        const content = item.content.trim() || "0";
        return `abs(${balanceParentheses(content)})`;
      }
      return "";
    })
    .join("");
}

// Convert item list into single line human-readable string
export function serializeToText(itemList: ExprItem[]): string {
  return itemList
    .map((item) => {
      if (item.type === "text") return item.value;
      if (item.type === "sqrt") return `${item.root === 3 ? "³√" : "√"}(${item.content})`;
      if (item.type === "frac") return `(${item.num || "■"})/(${item.den || "■"})`;
      if (item.type === "mixed_frac") return `${item.whole || "■"} (${item.num || "■"})/(${item.den || "■"})`;
      if (item.type === "pow") return `${item.base || "■"}^(${item.exp || "■"})`;
      if (item.type === "logbase") return `log_${item.base || "■"}(${item.arg || "■"})`;
      if (item.type === "abs") return `|${item.content}|`;
      return "";
    })
    .join("");
}

export interface EvaluateOptions {
  angleMode?: "DEG" | "RAD";
  ans?: number;
}

// Core Math Evaluator
export function evaluateExpression(
  mathStr: string,
  options: EvaluateOptions = {}
): { num: number; text: string } {
  try {
    if (!mathStr || !mathStr.trim()) return { num: 0, text: "0" };

    const angleMode = options.angleMode || "DEG";
    const ans = options.ans ?? 0;
    const isDeg = angleMode === "DEG";

    let sanitized = mathStr
      .replace(/×/g, "*")
      .replace(/÷/g, "/")
      .replace(/−/g, "-")
      .replace(/π/g, `(Math.PI)`)
      .replace(/Ans/g, `(${ans})`)
      .replace(/e(?![a-z])/gi, `(Math.E)`);

    // Radicals first so ³√ is not converted to **3√
    sanitized = sanitized.replace(/³√\(/g, "cbrt(");
    sanitized = sanitized.replace(/³√([0-9.]+)/g, "cbrt($1)");
    sanitized = sanitized.replace(/√\(/g, "sqrt(");
    sanitized = sanitized.replace(/√([0-9.]+)/g, "sqrt($1)");

    // Superscript powers: ² -> **2, ³ -> **3
    sanitized = sanitized.replace(/²/g, "**2").replace(/³/g, "**3");

    // Scientific notation button ×10^x
    sanitized = sanitized.replace(/×10\^/g, "*10**");

    // Percentages: 50% -> (50/100)
    sanitized = sanitized.replace(/(\d+(\.\d+)?)%/g, "($1/100)");

    // Factorial: 5! -> factorial(5) or (3+2)! -> factorial(3+2)
    sanitized = sanitized.replace(/(\d+)!/g, "factorial($1)");
    sanitized = sanitized.replace(/(\([^\(\)]+\))!/g, "factorial$1");

    // Combinatorics: 5 P 2 -> nPr(5, 2), 5 C 2 -> nCr(5, 2)
    sanitized = sanitized.replace(/(\d+)\s*P\s*(\d+)/g, "nPr($1,$2)");
    sanitized = sanitized.replace(/(\d+)\s*C\s*(\d+)/g, "nCr($1,$2)");

    // Absolute value: |x| -> abs(x)
    sanitized = sanitized.replace(/\|([^|]+)\|/g, "abs($1)");

    // Inverse trig symbols
    sanitized = sanitized.replace(/sin⁻¹\(/g, "asin(");
    sanitized = sanitized.replace(/cos⁻¹\(/g, "acos(");
    sanitized = sanitized.replace(/tan⁻¹\(/g, "atan(");

    // Arbitrary base log: log_(base)(val) or log_(base, val)
    sanitized = sanitized.replace(/log_\(([^,)]+)\)\(([^)]+)\)/g, "log_b($1,$2)");
    sanitized = sanitized.replace(/log_\(([^,)]+),([^)]+)\)/g, "log_b($1,$2)");
    sanitized = sanitized.replace(/log_([0-9.]+)\(([^)]+)\)/g, "log_b($1,$2)");

    // Implicit multiplication:
    // e.g. 2(3) -> 2*(3), (2)(3) -> (2)*(3), 2sqrt(4) -> 2*sqrt(4), 2log(10) -> 2*log(10)
    // 2sin(30) -> 2*sin(30), 2pi -> 2*pi
    sanitized = sanitized.replace(/(\d)\s*\(/g, "$1*(");
    sanitized = sanitized.replace(/\)\s*\(/g, ")*(");
    sanitized = sanitized.replace(/\)\s*(\d)/g, ")*$1");
    sanitized = sanitized.replace(/(\d)\s*(sqrt|cbrt|log|ln|sin|cos|tan|asin|acos|atan|abs|Pol|Rec)\(/g, "$1*$2(");
    sanitized = sanitized.replace(/\)\s*(sqrt|cbrt|log|ln|sin|cos|tan|asin|acos|atan|abs|Pol|Rec)\(/g, ")*$1(");

    // Exponentiation operator: ^ -> **
    // Replace standalone ^ with **
    sanitized = sanitized.replace(/\^/g, "**");

    // Close any unclosed parentheses automatically before evaluating
    sanitized = balanceParentheses(sanitized);

    // Custom execution context with all Casio mathematical functions
    const evalScope = {
      Math,
      factorial,
      nPr,
      nCr,
      sqrt: (x: number) => {
        if (x < 0) return NaN;
        return Math.sqrt(x);
      },
      cbrt: (x: number) => Math.cbrt(x),
      abs: (x: number) => Math.abs(x),
      Abs: (x: number) => Math.abs(x),
      log: (x: number) => {
        if (x <= 0) return NaN;
        return Math.log10(x);
      },
      ln: (x: number) => {
        if (x <= 0) return NaN;
        return Math.log(x);
      },
      log_b: (base: number, x: number) => {
        if (base <= 0 || base === 1 || x <= 0) return NaN;
        return Math.log(x) / Math.log(base);
      },
      sin: (x: number) => {
        const rad = isDeg ? (x * Math.PI) / 180 : x;
        // Clean near-zero for multiples of 180 deg
        if (isDeg && Math.abs(x % 180) < 1e-11) return 0;
        return Math.sin(rad);
      },
      cos: (x: number) => {
        const rad = isDeg ? (x * Math.PI) / 180 : x;
        // Clean near-zero for odd multiples of 90 deg (90, 270, etc.)
        if (isDeg && Math.abs((x - 90) % 180) < 1e-11) return 0;
        return Math.cos(rad);
      },
      tan: (x: number) => {
        const rad = isDeg ? (x * Math.PI) / 180 : x;
        if (isDeg && Math.abs((x - 90) % 180) < 1e-11) return NaN;
        if (isDeg && Math.abs(x % 180) < 1e-11) return 0;
        return Math.tan(rad);
      },
      asin: (x: number) => {
        if (x < -1 || x > 1) return NaN;
        const rad = Math.asin(x);
        return isDeg ? (rad * 180) / Math.PI : rad;
      },
      acos: (x: number) => {
        if (x < -1 || x > 1) return NaN;
        const rad = Math.acos(x);
        return isDeg ? (rad * 180) / Math.PI : rad;
      },
      atan: (x: number) => {
        const rad = Math.atan(x);
        return isDeg ? (rad * 180) / Math.PI : rad;
      },
      Pol: (x: number, y: number) => Math.hypot(x, y),
      Rec: (r: number, theta: number) => {
        const rad = isDeg ? (theta * Math.PI) / 180 : theta;
        return r * Math.cos(rad);
      },
    };

    // Strict security whitelist check: ensure expression strictly contains authorized math tokens
    const stripped = sanitized
      .replace(/Math\.(PI|E)/g, "")
      .replace(/\b(factorial|nPr|nCr|sqrt|cbrt|abs|Abs|log_b|log|ln|sin|cos|tan|asin|acos|atan|Pol|Rec|Infinity|NaN)\b/g, "");

    if (!/^[0-9\s+\-*/%(),.^*]+$/.test(stripped)) {
      return { num: NaN, text: "Syntax ERROR" };
    }

    const fnKeys = Object.keys(evalScope);
    const fnVals = Object.values(evalScope);

    const evalFn = new Function(
      ...fnKeys,
      `"use strict"; return (${sanitized});`
    );

    const computed = evalFn(...fnVals);

    if (typeof computed !== "number" || isNaN(computed)) {
      return { num: NaN, text: "Math ERROR" };
    }

    if (!isFinite(computed)) {
      return { num: Infinity, text: computed > 0 ? "Infinity" : "-Infinity" };
    }

    let cleaned = Math.abs(computed) < 1e-12 ? 0 : computed;
    if (Math.abs(cleaned - Math.round(cleaned)) < 1e-11) {
      cleaned = Math.round(cleaned);
    } else {
      cleaned = Number(cleaned.toPrecision(10));
    }

    return { num: cleaned, text: String(cleaned) };
  } catch {
    return { num: NaN, text: "Syntax ERROR" };
  }
}
