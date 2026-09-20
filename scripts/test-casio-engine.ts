/**
 * Comprehensive Test Suite for Casio fx-83GT X ClassWiz Math Engine
 * Tests every feature imaginable: fractions, powers, roots, logs, trig, combinatorics, etc.
 */

import {
  evaluateExpression,
  toFraction,
  serializeToMath,
  ExprItem,
  factorial,
  nPr,
  nCr,
} from "../lib/casio-math-engine";

interface TestCase {
  id: number;
  category: string;
  name: string;
  expression: string | ExprItem[];
  expected: number | string;
  angleMode?: "DEG" | "RAD";
  ans?: number;
}

const tests: TestCase[] = [
  // =========================================================================
  // 1. BASIC ARITHMETIC & PRECEDENCE (15 tests)
  // =========================================================================
  { id: 1, category: "Arithmetic", name: "Simple addition", expression: "2 + 3", expected: 5 },
  { id: 2, category: "Arithmetic", name: "Subtraction with minus symbol", expression: "10 − 4", expected: 6 },
  { id: 3, category: "Arithmetic", name: "Multiplication with × symbol", expression: "7 × 8", expected: 56 },
  { id: 4, category: "Arithmetic", name: "Division with ÷ symbol", expression: "144 ÷ 12", expected: 12 },
  { id: 5, category: "Arithmetic", name: "PEMDAS order of operations", expression: "2 + 3 × 4", expected: 14 },
  { id: 6, category: "Arithmetic", name: "Parentheses precedence", expression: "(2 + 3) × 4", expected: 20 },
  { id: 7, category: "Arithmetic", name: "Negative numbers", expression: "−5 + 12", expected: 7 },
  { id: 8, category: "Arithmetic", name: "Double negatives", expression: "10 − (−5)", expected: 15 },
  { id: 9, category: "Arithmetic", name: "Decimals addition", expression: "0.1 + 0.2", expected: 0.3 },
  { id: 10, category: "Arithmetic", name: "Decimal multiplication", expression: "2.5 × 4", expected: 10 },
  { id: 11, category: "Arithmetic", name: "Complex precedence", expression: "100 − 4 × (10 ÷ 2) + 5", expected: 85 },
  { id: 12, category: "Arithmetic", name: "Implicit multiplication with parentheses", expression: "5(10)", expected: 50 },
  { id: 13, category: "Arithmetic", name: "Implicit multiplication between parentheses", expression: "(3 + 2)(4 + 1)", expected: 25 },
  { id: 14, category: "Arithmetic", name: "Ans recall addition", expression: "Ans + 10", expected: 25, ans: 15 },
  { id: 15, category: "Arithmetic", name: "Ans multiplication", expression: "3Ans", expected: 30, ans: 10 },

  // =========================================================================
  // 2. POWERS & EXPONENTS (15 tests)
  // =========================================================================
  { id: 16, category: "Powers", name: "Squaring symbol ²", expression: "5²", expected: 25 },
  { id: 17, category: "Powers", name: "Cubing symbol ³", expression: "3³", expected: 27 },
  { id: 18, category: "Powers", name: "Caret power ^", expression: "2^4", expected: 16 },
  { id: 19, category: "Powers", name: "Zero exponent", expression: "99^0", expected: 1 },
  { id: 20, category: "Powers", name: "Negative exponent", expression: "2^(-1)", expected: 0.5 },
  { id: 21, category: "Powers", name: "Negative exponent ^-2", expression: "4^(-2)", expected: 0.0625 },
  { id: 22, category: "Powers", name: "Fractional exponent 16^0.5", expression: "16^(0.5)", expected: 4 },
  { id: 23, category: "Powers", name: "Fractional exponent 27^(1/3)", expression: "27^(1/3)", expected: 3 },
  { id: 24, category: "Powers", name: "Sum of squares", expression: "3² + 4²", expected: 25 },
  { id: 25, category: "Powers", name: "Power of a sum", expression: "(2 + 3)²", expected: 25 },
  { id: 26, category: "Powers", name: "Nested powers", expression: "(2²)³", expected: 64 },
  { id: 27, category: "Powers", name: "Scientific notation ×10^", expression: "2.5×10^3", expected: 2500 },
  { id: 28, category: "Powers", name: "Negative scientific notation", expression: "5×10^(−2)", expected: 0.05 },
  { id: 29, category: "Powers", name: "Euler e power", expression: "e^1", expected: Number(Math.E.toPrecision(10)) },
  { id: 30, category: "Powers", name: "Power with Ans", expression: "Ans²", expected: 49, ans: 7 },

  // =========================================================================
  // 3. ROOTS & RADICALS (15 tests)
  // =========================================================================
  { id: 31, category: "Roots", name: "Square root √(x)", expression: "√(16)", expected: 4 },
  { id: 32, category: "Roots", name: "Square root unbracketed √x", expression: "√25", expected: 5 },
  { id: 33, category: "Roots", name: "Cube root ³√(x)", expression: "³√(27)", expected: 3 },
  { id: 34, category: "Roots", name: "Cube root unbracketed ³√x", expression: "³√64", expected: 4 },
  { id: 35, category: "Roots", name: "Cube root of negative number", expression: "³√(−8)", expected: -2 },
  { id: 36, category: "Roots", name: "Square root of sum (Pythagoras)", expression: "√(3² + 4²)", expected: 5 },
  { id: 37, category: "Roots", name: "Nested square roots", expression: "√(√(16))", expected: 2 },
  { id: 38, category: "Roots", name: "Root multiplied by coefficient", expression: "2√(9)", expected: 6 },
  { id: 39, category: "Roots", name: "Product of two roots", expression: "√(4) × √(9)", expected: 6 },
  { id: 40, category: "Roots", name: "Implicit product of roots", expression: "√(4)√(9)", expected: 6 },
  { id: 41, category: "Roots", name: "Square of a root", expression: "(√(7))²", expected: 7 },
  { id: 42, category: "Roots", name: "Root of a fraction", expression: "√(9/16)", expected: 0.75 },
  { id: 43, category: "Roots", name: "Root with decimal", expression: "√(0.25)", expected: 0.5 },
  { id: 44, category: "Roots", name: "Root of zero", expression: "√(0)", expected: 0 },
  { id: 45, category: "Roots", name: "Unclosed root parenthesis", expression: "√(49", expected: 7 },

  // =========================================================================
  // 4. VERTICAL FRACTIONS & SQUARING IN FRACTIONS (15 tests)
  // =========================================================================
  {
    id: 46,
    category: "Fractions-Powers",
    name: "AST Fraction: simple 3/4",
    expression: [{ id: "1", type: "frac", num: "3", den: "4" }],
    expected: 0.75,
  },
  {
    id: 47,
    category: "Fractions-Powers",
    name: "AST Fraction: square in numerator 3²/4",
    expression: [{ id: "1", type: "frac", num: "3²", den: "4" }],
    expected: 2.25,
  },
  {
    id: 48,
    category: "Fractions-Powers",
    name: "AST Fraction: square in denominator 8/2²",
    expression: [{ id: "1", type: "frac", num: "8", den: "2²" }],
    expected: 2,
  },
  {
    id: 49,
    category: "Fractions-Powers",
    name: "AST Fraction: squares in both 3²/2²",
    expression: [{ id: "1", type: "frac", num: "3²", den: "2²" }],
    expected: 2.25,
  },
  {
    id: 50,
    category: "Fractions-Powers",
    name: "AST Fraction: cube in numerator 2³/4",
    expression: [{ id: "1", type: "frac", num: "2³", den: "4" }],
    expected: 2,
  },
  {
    id: 51,
    category: "Fractions-Powers",
    name: "AST Fraction: caret power in numerator 2^4 / 8",
    expression: [{ id: "1", type: "frac", num: "2^4", den: "8" }],
    expected: 2,
  },
  {
    id: 52,
    category: "Fractions-Powers",
    name: "AST Fraction: power sum in numerator (2² + 3²) / 13",
    expression: [{ id: "1", type: "frac", num: "2² + 3²", den: "13" }],
    expected: 1,
  },
  {
    id: 53,
    category: "Fractions-Powers",
    name: "AST Fraction: unclosed power in numerator 2^(3 / 4",
    expression: [{ id: "1", type: "frac", num: "2^(3", den: "4" }],
    expected: 2,
  },
  {
    id: 54,
    category: "Fractions-Powers",
    name: "AST Fraction: negative power in denominator 5 / 2^(-1)",
    expression: [{ id: "1", type: "frac", num: "5", den: "2^(-1)" }],
    expected: 10,
  },
  {
    id: 55,
    category: "Fractions-Powers",
    name: "String Fraction with square: (4²)/(2)",
    expression: "((4²)/(2))",
    expected: 8,
  },
  {
    id: 56,
    category: "Fractions-Powers",
    name: "String Fraction with sum of cubes: (2³ + 3³)/(7)",
    expression: "((2³ + 3³)/(7))",
    expected: 5,
  },
  {
    id: 57,
    category: "Fractions-Powers",
    name: "Fraction addition: 1/2 + 1/4",
    expression: "((1)/(2)) + ((1)/(4))",
    expected: 0.75,
  },
  {
    id: 58,
    category: "Fractions-Powers",
    name: "Fraction multiplied by power: (1/2) × 2³",
    expression: "((1)/(2)) × 2³",
    expected: 4,
  },
  {
    id: 59,
    category: "Fractions-Powers",
    name: "Fraction squared: ((3)/(2))²",
    expression: "((3)/(2))²",
    expected: 2.25,
  },
  {
    id: 60,
    category: "Fractions-Powers",
    name: "Fraction with scientific notation in denominator",
    expression: "((5)/(10²))",
    expected: 0.05,
  },

  // =========================================================================
  // 5. ROOTING IN FRACTIONS (15 tests)
  // =========================================================================
  {
    id: 61,
    category: "Fractions-Roots",
    name: "AST Fraction: root in numerator √(16) / 2",
    expression: [{ id: "1", type: "frac", num: "√(16)", den: "2" }],
    expected: 2,
  },
  {
    id: 62,
    category: "Fractions-Roots",
    name: "AST Fraction: unclosed root in numerator √(16 / 2",
    expression: [{ id: "1", type: "frac", num: "√(16", den: "2" }],
    expected: 2,
  },
  {
    id: 63,
    category: "Fractions-Roots",
    name: "AST Fraction: root in denominator 10 / √(25)",
    expression: [{ id: "1", type: "frac", num: "10", den: "√(25)" }],
    expected: 2,
  },
  {
    id: 64,
    category: "Fractions-Roots",
    name: "AST Fraction: roots in both √(36) / √(9)",
    expression: [{ id: "1", type: "frac", num: "√(36)", den: "√(9)" }],
    expected: 2,
  },
  {
    id: 65,
    category: "Fractions-Roots",
    name: "AST Fraction: cube root in numerator ³√(27) / 3",
    expression: [{ id: "1", type: "frac", num: "³√(27)", den: "3" }],
    expected: 1,
  },
  {
    id: 66,
    category: "Fractions-Roots",
    name: "AST Fraction: cube root in denominator 16 / ³√(64)",
    expression: [{ id: "1", type: "frac", num: "16", den: "³√(64)" }],
    expected: 4,
  },
  {
    id: 67,
    category: "Fractions-Roots",
    name: "AST Fraction: root of sum in numerator √(9 + 16) / 5",
    expression: [{ id: "1", type: "frac", num: "√(9 + 16)", den: "5" }],
    expected: 1,
  },
  {
    id: 68,
    category: "Fractions-Roots",
    name: "AST Fraction: root of squares in numerator √(3² + 4²) / 2",
    expression: [{ id: "1", type: "frac", num: "√(3² + 4²)", den: "2" }],
    expected: 2.5,
  },
  {
    id: 69,
    category: "Fractions-Roots",
    name: "AST Fraction: square plus root in numerator (3² + √16) / 2",
    expression: [{ id: "1", type: "frac", num: "3² + √16", den: "2" }],
    expected: 6.5,
  },
  {
    id: 70,
    category: "Fractions-Roots",
    name: "String Fraction: ((√49)/(7))",
    expression: "((√49)/(7))",
    expected: 1,
  },
  {
    id: 71,
    category: "Fractions-Roots",
    name: "Root encompassing a fraction AST",
    expression: [
      {
        id: "1",
        type: "sqrt",
        root: 2,
        content: "((16)/(4))",
      },
    ],
    expected: 2,
  },
  {
    id: 72,
    category: "Fractions-Roots",
    name: "Cube root encompassing a fraction AST",
    expression: [
      {
        id: "1",
        type: "sqrt",
        root: 3,
        content: "((54)/(2))",
      },
    ],
    expected: 3,
  },
  {
    id: 73,
    category: "Fractions-Roots",
    name: "Nested root inside fraction: (√(√(81))) / 3",
    expression: "((√(√(81)))/(3))",
    expected: 1,
  },
  {
    id: 74,
    category: "Fractions-Roots",
    name: "Fraction with unbracketed root in denominator: 12 / √9",
    expression: "((12)/(√9))",
    expected: 4,
  },
  {
    id: 75,
    category: "Fractions-Roots",
    name: "Fraction with root times coefficient: (3√4) / (2√9)",
    expression: "((3√(4))/(2√(9)))",
    expected: 1,
  },

  // =========================================================================
  // 6. LOGGING IN FRACTIONS (15 tests)
  // =========================================================================
  {
    id: 76,
    category: "Fractions-Logs",
    name: "AST Fraction: log(100) / 2",
    expression: [{ id: "1", type: "frac", num: "log(100)", den: "2" }],
    expected: 1,
  },
  {
    id: 77,
    category: "Fractions-Logs",
    name: "AST Fraction: unclosed log in numerator log(100 / 2",
    expression: [{ id: "1", type: "frac", num: "log(100", den: "2" }],
    expected: 1,
  },
  {
    id: 78,
    category: "Fractions-Logs",
    name: "AST Fraction: unclosed log in denominator 6 / log(1000",
    expression: [{ id: "1", type: "frac", num: "6", den: "log(1000" }],
    expected: 2,
  },
  {
    id: 79,
    category: "Fractions-Logs",
    name: "AST Fraction: ln(e) / 1",
    expression: [{ id: "1", type: "frac", num: "ln(e)", den: "1" }],
    expected: 1,
  },
  {
    id: 80,
    category: "Fractions-Logs",
    name: "AST Fraction: unclosed ln in numerator ln(e / 2",
    expression: [{ id: "1", type: "frac", num: "ln(e", den: "2" }],
    expected: 0.5,
  },
  {
    id: 81,
    category: "Fractions-Logs",
    name: "AST Fraction: log with power log(10²) / 2",
    expression: [{ id: "1", type: "frac", num: "log(10²)", den: "2" }],
    expected: 1,
  },
  {
    id: 82,
    category: "Fractions-Logs",
    name: "AST Fraction: log with root log(√100) / 1",
    expression: [{ id: "1", type: "frac", num: "log(√100)", den: "1" }],
    expected: 1,
  },
  {
    id: 83,
    category: "Fractions-Logs",
    name: "AST Fraction: arbitrary base log log_(2)(8) / 3",
    expression: [{ id: "1", type: "frac", num: "log_(2)(8)", den: "3" }],
    expected: 1,
  },
  {
    id: 84,
    category: "Fractions-Logs",
    name: "AST Fraction: arbitrary base log in denominator 12 / log_(3)(81)",
    expression: [{ id: "1", type: "frac", num: "12", den: "log_(3)(81)" }],
    expected: 3,
  },
  {
    id: 85,
    category: "Fractions-Logs",
    name: "String Fraction: log(1000)/log(10)",
    expression: "((log(1000))/(log(10)))",
    expected: 3,
  },
  {
    id: 86,
    category: "Fractions-Logs",
    name: "String Fraction: (ln(e²) + log(100)) / 2",
    expression: "((ln(e²) + log(100))/(2))",
    expected: 2,
  },
  {
    id: 87,
    category: "Fractions-Logs",
    name: "Fraction with log inside square root: √(log(10000)) / 2",
    expression: "((√(log(10000)))/(2))",
    expected: 1,
  },
  {
    id: 88,
    category: "Fractions-Logs",
    name: "Log of a fraction: log(100/10)",
    expression: "log(100/10)",
    expected: 1,
  },
  {
    id: 89,
    category: "Fractions-Logs",
    name: "Natural log of fraction: ln(e³/e)",
    expression: "ln(e³/e)",
    expected: 2,
  },
  {
    id: 90,
    category: "Fractions-Logs",
    name: "Ultimate fraction combination: (√16 + 3²)/(log(100) + 1)",
    expression: [{ id: "1", type: "frac", num: "√16 + 3²", den: "log(100) + 1" }],
    expected: 4.333333333,
  },

  // =========================================================================
  // 7. LOGARITHMS STANDALONE (10 tests)
  // =========================================================================
  { id: 91, category: "Logs", name: "Common log(10)", expression: "log(10)", expected: 1 },
  { id: 92, category: "Logs", name: "Common log(1000)", expression: "log(1000)", expected: 3 },
  { id: 93, category: "Logs", name: "Common log(1)", expression: "log(1)", expected: 0 },
  { id: 94, category: "Logs", name: "Natural log ln(e)", expression: "ln(e)", expected: 1 },
  { id: 95, category: "Logs", name: "Natural log ln(1)", expression: "ln(1)", expected: 0 },
  { id: 96, category: "Logs", name: "Arbitrary base log_(2)(16)", expression: "log_(2)(16)", expected: 4 },
  { id: 97, category: "Logs", name: "Arbitrary base log_(5)(125)", expression: "log_(5)(125)", expected: 3 },
  { id: 98, category: "Logs", name: "Log with unclosed parenthesis", expression: "log(10000", expected: 4 },
  { id: 99, category: "Logs", name: "Ln with unclosed parenthesis", expression: "ln(e", expected: 1 },
  { id: 100, category: "Logs", name: "Sum of logs: log(10) + log(100)", expression: "log(10) + log(100)", expected: 3 },

  // =========================================================================
  // 8. TRIGONOMETRY (15 tests)
  // =========================================================================
  { id: 101, category: "Trig-DEG", name: "sin(0°)", expression: "sin(0)", expected: 0, angleMode: "DEG" },
  { id: 102, category: "Trig-DEG", name: "sin(30°)", expression: "sin(30)", expected: 0.5, angleMode: "DEG" },
  { id: 103, category: "Trig-DEG", name: "sin(90°)", expression: "sin(90)", expected: 1, angleMode: "DEG" },
  { id: 104, category: "Trig-DEG", name: "sin(180°)", expression: "sin(180)", expected: 0, angleMode: "DEG" },
  { id: 105, category: "Trig-DEG", name: "cos(0°)", expression: "cos(0)", expected: 1, angleMode: "DEG" },
  { id: 106, category: "Trig-DEG", name: "cos(60°)", expression: "cos(60)", expected: 0.5, angleMode: "DEG" },
  { id: 107, category: "Trig-DEG", name: "cos(90°)", expression: "cos(90)", expected: 0, angleMode: "DEG" },
  { id: 108, category: "Trig-DEG", name: "tan(0°)", expression: "tan(0)", expected: 0, angleMode: "DEG" },
  { id: 109, category: "Trig-DEG", name: "tan(45°)", expression: "tan(45)", expected: 1, angleMode: "DEG" },
  { id: 110, category: "Trig-DEG", name: "Pythagorean trig identity: sin(30)² + cos(30)²", expression: "sin(30)² + cos(30)²", expected: 1, angleMode: "DEG" },
  { id: 111, category: "Trig-DEG", name: "asin(0.5) -> 30°", expression: "asin(0.5)", expected: 30, angleMode: "DEG" },
  { id: 112, category: "Trig-DEG", name: "acos(0.5) -> 60°", expression: "acos(0.5)", expected: 60, angleMode: "DEG" },
  { id: 113, category: "Trig-DEG", name: "atan(1) -> 45°", expression: "atan(1)", expected: 45, angleMode: "DEG" },
  { id: 114, category: "Trig-DEG", name: "Trig in fraction: (sin(30))/(cos(60))", expression: "((sin(30))/(cos(60)))", expected: 1, angleMode: "DEG" },
  { id: 115, category: "Trig-RAD", name: "RAD mode: sin(π/2)", expression: "sin(π/2)", expected: 1, angleMode: "RAD" },

  // =========================================================================
  // 9. COMBINATORICS, PERCENT, ABS & POL/REC (15 tests)
  // =========================================================================
  { id: 116, category: "Combinatorics", name: "Factorial 0!", expression: "0!", expected: 1 },
  { id: 117, category: "Combinatorics", name: "Factorial 5!", expression: "5!", expected: 120 },
  { id: 118, category: "Combinatorics", name: "Factorial 7!", expression: "7!", expected: 5040 },
  { id: 119, category: "Combinatorics", name: "Permutations 5 P 2", expression: "5 P 2", expected: 20 },
  { id: 120, category: "Combinatorics", name: "Permutations 6 P 3", expression: "6 P 3", expected: 120 },
  { id: 121, category: "Combinatorics", name: "Combinations 5 C 2", expression: "5 C 2", expected: 10 },
  { id: 122, category: "Combinatorics", name: "Combinations 10 C 3", expression: "10 C 3", expected: 120 },
  { id: 123, category: "Combinatorics", name: "Percent: 50%", expression: "50%", expected: 0.5 },
  { id: 124, category: "Combinatorics", name: "Percent in product: 200 × 15%", expression: "200 × 15%", expected: 30 },
  { id: 125, category: "Combinatorics", name: "Absolute value: |-15|", expression: "|-15|", expected: 15 },
  { id: 126, category: "Combinatorics", name: "Absolute value of difference: |5 - 12|", expression: "|5 - 12|", expected: 7 },
  { id: 127, category: "Combinatorics", name: "Polar coordinate: Pol(3, 4) hypotenuse", expression: "Pol(3, 4)", expected: 5 },
  { id: 128, category: "Combinatorics", name: "Polar coordinate: Pol(5, 12)", expression: "Pol(5, 12)", expected: 13 },
  { id: 129, category: "Combinatorics", name: "Rectangular coordinate: Rec(10, 60)", expression: "Rec(10, 60)", expected: 5, angleMode: "DEG" },
  { id: 130, category: "Combinatorics", name: "Factorial in fraction: (6!)/(4!)", expression: "((6!)/(4!))", expected: 30 },

  // =========================================================================
  // 10. ERROR HANDLING & EDGE CASES (10 tests)
  // =========================================================================
  { id: 131, category: "EdgeCases", name: "Division by zero returns Infinity", expression: "10 ÷ 0", expected: "Infinity" },
  { id: 132, category: "EdgeCases", name: "Negative square root returns Math ERROR", expression: "√(−4)", expected: "Math ERROR" },
  { id: 133, category: "EdgeCases", name: "Log of negative returns Math ERROR", expression: "log(−10)", expected: "Math ERROR" },
  { id: 134, category: "EdgeCases", name: "Log of zero returns Math ERROR", expression: "log(0)", expected: "Math ERROR" },
  { id: 135, category: "EdgeCases", name: "Ln of negative returns Math ERROR", expression: "ln(−5)", expected: "Math ERROR" },
  { id: 136, category: "EdgeCases", name: "Empty expression returns 0", expression: "", expected: 0 },
  { id: 137, category: "EdgeCases", name: "Whitespace only returns 0", expression: "   ", expected: 0 },
  { id: 138, category: "EdgeCases", name: "Invalid combinations n < r returns Math ERROR", expression: "3 C 5", expected: "Math ERROR" },
  { id: 139, category: "EdgeCases", name: "Negative factorial returns Math ERROR", expression: "(−3)!", expected: "Math ERROR" },
  { id: 140, category: "EdgeCases", name: "tan(90°) undefined in DEG returns Math ERROR", expression: "tan(90)", expected: "Math ERROR", angleMode: "DEG" },

  // =========================================================================
  // 12. PI IN TERMS OF PI (10 tests)
  // =========================================================================
  { id: 141, category: "Pi-Format", name: "Standalone π yields π", expression: "π", expected: "π" },
  { id: 142, category: "Pi-Format", name: "Multiplication 2 × π yields 2π", expression: "2 × π", expected: "2π" },
  { id: 143, category: "Pi-Format", name: "Sum π + π yields 2π", expression: "π + π", expected: "2π" },
  { id: 144, category: "Pi-Format", name: "Half pi π ÷ 2 yields π/2", expression: "π ÷ 2", expected: "π/2" },
  { id: 145, category: "Pi-Format", name: "Fractional pi 3 × π ÷ 4 yields 3π/4", expression: "3 × π ÷ 4", expected: "3π/4" },
  { id: 146, category: "Pi-Format", name: "Circumference 2 × π × 5 yields 10π", expression: "2 × π × 5", expected: "10π" },
  { id: 147, category: "Pi-Format", name: "Circle area π × 5² yields 25π", expression: "π × 5²", expected: "25π" },
  { id: 148, category: "Pi-Format", name: "Negative pi −3 × π yields −3π", expression: "−3 × π", expected: "−3π" },
  { id: 149, category: "Pi-Format", name: "Division 12 × π ÷ 4 yields 3π", expression: "12 × π ÷ 4", expected: "3π" },
  { id: 150, category: "Pi-Format", name: "Mixed calculation (1 ÷ 3) × π × 6 yields 2π", expression: "(1 ÷ 3) × π × 6", expected: "2π" },
];

// Fraction Simplifier (S <=> D) Tests
const fractionTests = [
  { val: 0.5, expectedNum: 1, expectedDen: 2 },
  { val: 0.75, expectedNum: 3, expectedDen: 4 },
  { val: 0.25, expectedNum: 1, expectedDen: 4 },
  { val: 0.2, expectedNum: 1, expectedDen: 5 },
  { val: 0.125, expectedNum: 1, expectedDen: 8 },
  { val: 1.5, expectedNum: 3, expectedDen: 2 },
  { val: 2.25, expectedNum: 9, expectedDen: 4 },
  { val: 0.3333333333, expectedNum: 1, expectedDen: 3 },
  { val: 0.6666666667, expectedNum: 2, expectedDen: 3 },
  { val: 1.75, expectedNum: 7, expectedDen: 4 },
  { val: -0.5, expectedNum: -1, expectedDen: 2 },
  { val: -2.5, expectedNum: -5, expectedDen: 2 },
];

function runTests() {
  console.log("=================================================================");
  console.log("   CASIO fx-83GT X ClassWiz TEST SUITE — 150+ COMPREHENSIVE TESTS");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    let mathStr = typeof t.expression === "string" ? t.expression : serializeToMath(t.expression);
    const res = evaluateExpression(mathStr, {
      angleMode: t.angleMode,
      ans: t.ans,
    });

    let isPass = false;
    if (typeof t.expected === "number") {
      isPass = Math.abs(res.num - t.expected) < 1e-4;
    } else {
      isPass = res.text === t.expected;
    }

    if (isPass) {
      passed++;
      console.log(`  ✓ [#${t.id.toString().padStart(3, "0")}] [${t.category.padEnd(16)}] ${t.name} => ${res.text}`);
    } else {
      failed++;
      console.error(
        `  ✗ [#${t.id.toString().padStart(3, "0")}] [${t.category.padEnd(16)}] ${t.name}: EXPECTED ${t.expected}, GOT ${res.text} (${res.num}) [input: "${mathStr}"]`
      );
    }
  }

  console.log("\n--- S <=> D Fraction Conversion Tests ---");
  for (const [idx, ft] of fractionTests.entries()) {
    const frac = toFraction(ft.val);
    const isPass = frac && frac.num === ft.expectedNum && frac.den === ft.expectedDen;
    if (isPass) {
      passed++;
      console.log(`  ✓ [Frac #${(idx + 1).toString().padStart(2, "0")}] toFraction(${ft.val}) => ${frac.num}/${frac.den}`);
    } else {
      failed++;
      console.error(
        `  ✗ [Frac #${(idx + 1).toString().padStart(2, "0")}] toFraction(${ft.val}): EXPECTED ${ft.expectedNum}/${ft.expectedDen}, GOT ${frac ? `${frac.num}/${frac.den}` : "null"}`
      );
    }
  }

  console.log("\n=================================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log(`SUCCESS RATE: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
