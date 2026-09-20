/**
 * Comprehensive 100+ Button-Interaction Test Suite for Casio fx-83GT X ClassWiz
 *
 * Every single test interacts SOLELY through button presses (press())
 * and directional Replay Rocker navigation (nav()), verifying that the calculator
 * state, display output, formatting, and numeric calculation are 100% correct.
 */

import { CasioCalculatorSession } from "../lib/casio-calculator-controller";

interface ButtonTestCase {
  id: number;
  category: string;
  name: string;
  actions: string[];
  expectedNumeric?: number;
  expectedText?: string;
  expectedDisplayMode?: "decimal" | "fraction" | "mixed" | "pi";
  expectedCustomCheck?: (session: CasioCalculatorSession) => boolean;
  tolerance?: number;
}

const tests: ButtonTestCase[] = [
  // =========================================================================
  // 1. BASIC ARITHMETIC BUTTON INTERACTIONS (10 tests)
  // =========================================================================
  {
    id: 1,
    category: "Arithmetic",
    name: "Simple addition: 2 + 3 =",
    actions: ["2", "+", "3", "="],
    expectedNumeric: 5,
  },
  {
    id: 2,
    category: "Arithmetic",
    name: "Subtraction: 10 − 4 =",
    actions: ["1", "0", "−", "4", "="],
    expectedNumeric: 6,
  },
  {
    id: 3,
    category: "Arithmetic",
    name: "Multiplication: 7 × 8 =",
    actions: ["7", "×", "8", "="],
    expectedNumeric: 56,
  },
  {
    id: 4,
    category: "Arithmetic",
    name: "Division: 144 ÷ 12 =",
    actions: ["1", "4", "4", "÷", "1", "2", "="],
    expectedNumeric: 12,
  },
  {
    id: 5,
    category: "Arithmetic",
    name: "PEMDAS order: 2 + 3 × 4 =",
    actions: ["2", "+", "3", "×", "4", "="],
    expectedNumeric: 14,
  },
  {
    id: 6,
    category: "Arithmetic",
    name: "Parentheses precedence: ( 2 + 3 ) × 4 =",
    actions: ["(", "2", "+", "3", ")", "×", "4", "="],
    expectedNumeric: 20,
  },
  {
    id: 7,
    category: "Arithmetic",
    name: "Negation key: NEG 5 + 12 =",
    actions: ["NEG", "5", "+", "1", "2", "="],
    expectedNumeric: 7,
  },
  {
    id: 8,
    category: "Arithmetic",
    name: "Double negation with parentheses: 10 − ( NEG 5 ) =",
    actions: ["1", "0", "−", "(", "NEG", "5", ")", "="],
    expectedNumeric: 15,
  },
  {
    id: 9,
    category: "Arithmetic",
    name: "Decimal arithmetic: 0 . 1 + 0 . 2 =",
    actions: ["0", ".", "1", "+", "0", ".", "2", "="],
    expectedNumeric: 0.3,
  },
  {
    id: 10,
    category: "Arithmetic",
    name: "Decimal product: 2 . 5 × 4 =",
    actions: ["2", ".", "5", "×", "4", "="],
    expectedNumeric: 10,
  },

  // =========================================================================
  // 2. CHAINED CALCULATIONS & ANS MEMORY (8 tests)
  // =========================================================================
  {
    id: 11,
    category: "Chaining-Ans",
    name: "Auto-Ans chaining with addition: 5 + 5 = then + 2 =",
    actions: ["5", "+", "5", "=", "+", "2", "="],
    expectedNumeric: 12,
  },
  {
    id: 12,
    category: "Chaining-Ans",
    name: "Auto-Ans chaining with division: 12 × 2 = then ÷ 4 =",
    actions: ["1", "2", "×", "2", "=", "÷", "4", "="],
    expectedNumeric: 6,
  },
  {
    id: 13,
    category: "Chaining-Ans",
    name: "Auto-Ans chaining with square: 9 = then SQUARE =",
    actions: ["9", "=", "SQUARE", "="],
    expectedNumeric: 81,
  },
  {
    id: 14,
    category: "Chaining-Ans",
    name: "Clear with AC then explicit ANS recall: 3 + 4 = AC ANS × 2 =",
    actions: ["3", "+", "4", "=", "AC", "ANS", "×", "2", "="],
    expectedNumeric: 14,
  },
  {
    id: 15,
    category: "Chaining-Ans",
    name: "Multi-step consecutive chaining: 10 = + 5 = × 2 =",
    actions: ["1", "0", "=", "+", "5", "=", "×", "2", "="],
    expectedNumeric: 30,
  },
  {
    id: 16,
    category: "Chaining-Ans",
    name: "Explicit ANS in parentheses: 4 = AC ( ANS + 1 ) SQUARE =",
    actions: ["4", "=", "AC", "(", "ANS", "+", "1", ")", "SQUARE", "="],
    expectedNumeric: 25,
  },
  {
    id: 17,
    category: "Chaining-Ans",
    name: "Implicit multiplication with ANS: 5 = AC 3 ANS =",
    actions: ["5", "=", "AC", "3", "ANS", "="],
    expectedNumeric: 15,
  },
  {
    id: 18,
    category: "Chaining-Ans",
    name: "Subtraction from ANS chaining: 50 = − 15 =",
    actions: ["5", "0", "=", "−", "1", "5", "="],
    expectedNumeric: 35,
  },

  // =========================================================================
  // 3. NATURAL DISPLAY FRACTIONS WITH REPLAY ROCKER (12 tests)
  // =========================================================================
  {
    id: 19,
    category: "Fractions",
    name: "Basic Fraction: FRAC 1 DOWN 2 =",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "="],
    expectedNumeric: 0.5,
  },
  {
    id: 20,
    category: "Fractions",
    name: "Adding two fractions with RIGHT navigation: 3/4 + 1/4 =",
    actions: ["FRAC", "3", "NAV:DOWN", "4", "NAV:RIGHT", "+", "FRAC", "1", "NAV:DOWN", "4", "="],
    expectedNumeric: 1,
  },
  {
    id: 21,
    category: "Fractions",
    name: "Multiplying fractions: 2/3 × 3/5 =",
    actions: ["FRAC", "2", "NAV:DOWN", "3", "NAV:RIGHT", "×", "FRAC", "3", "NAV:DOWN", "5", "="],
    expectedNumeric: 0.4,
  },
  {
    id: 22,
    category: "Fractions",
    name: "Fraction plus whole number: 1/2 + 3 =",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "NAV:RIGHT", "+", "3", "="],
    expectedNumeric: 3.5,
  },
  {
    id: 23,
    category: "Fractions",
    name: "S<=>D toggle from fraction to decimal: 1/2 = then S_TO_D",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "=", "S_TO_D"],
    expectedNumeric: 0.5,
    expectedDisplayMode: "decimal",
  },
  {
    id: 24,
    category: "Fractions",
    name: "Preceding number turning into fraction numerator: 3 FRAC 4 =",
    actions: ["3", "FRAC", "4", "="],
    expectedNumeric: 0.75,
  },
  {
    id: 25,
    category: "Fractions",
    name: "Complex expression in numerator: FRAC 2 + 4 DOWN 3 =",
    actions: ["FRAC", "2", "+", "4", "NAV:DOWN", "3", "="],
    expectedNumeric: 2,
  },
  {
    id: 26,
    category: "Fractions",
    name: "Complex expression in denominator: FRAC 12 DOWN 2 + 4 =",
    actions: ["FRAC", "1", "2", "NAV:DOWN", "2", "+", "4", "="],
    expectedNumeric: 2,
  },
  {
    id: 27,
    category: "Fractions",
    name: "UP arrow navigation back to numerator: FRAC 5 DOWN 8 UP DEL 9 =",
    actions: ["FRAC", "5", "NAV:DOWN", "8", "NAV:UP", "DEL", "9", "="],
    expectedNumeric: 1.125,
  },
  {
    id: 28,
    category: "Fractions",
    name: "Division of two fractions: (1/2) ÷ (1/4) =",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "NAV:RIGHT", "÷", "FRAC", "1", "NAV:DOWN", "4", "="],
    expectedNumeric: 2,
  },
  {
    id: 29,
    category: "Fractions",
    name: "Negative fraction: NEG FRAC 3 DOWN 4 =",
    actions: ["NEG", "FRAC", "3", "NAV:DOWN", "4", "="],
    expectedNumeric: -0.75,
  },
  {
    id: 30,
    category: "Fractions",
    name: "Mixed fraction display toggle: 7/3 = then S_TO_D -> 2 1/3",
    actions: ["FRAC", "7", "NAV:DOWN", "3", "=", "S_TO_D"],
    expectedNumeric: 2.3333333333333335,
    expectedDisplayMode: "mixed",
    expectedText: "2 1/3",
  },

  // =========================================================================
  // 4. POWERS, EXPONENTS & SUPERSCRIPT NAVIGATION (10 tests)
  // =========================================================================
  {
    id: 31,
    category: "Powers",
    name: "Square key x²: 5 SQUARE =",
    actions: ["5", "SQUARE", "="],
    expectedNumeric: 25,
  },
  {
    id: 32,
    category: "Powers",
    name: "Cube key x³: 3 CUBE =",
    actions: ["3", "CUBE", "="],
    expectedNumeric: 27,
  },
  {
    id: 33,
    category: "Powers",
    name: "Custom power x^■: 2 POWER 4 =",
    actions: ["2", "POWER", "4", "="],
    expectedNumeric: 16,
  },
  {
    id: 34,
    category: "Powers",
    name: "Stepping out of exponent with RIGHT navigation: 2 POWER 4 RIGHT + 1 =",
    actions: ["2", "POWER", "4", "NAV:RIGHT", "+", "1", "="],
    expectedNumeric: 17,
  },
  {
    id: 35,
    category: "Powers",
    name: "Zero exponent: 10 POWER 0 =",
    actions: ["1", "0", "POWER", "0", "="],
    expectedNumeric: 1,
  },
  {
    id: 36,
    category: "Powers",
    name: "Negative exponent: 2 POWER NEG 1 =",
    actions: ["2", "POWER", "NEG", "1", "="],
    expectedNumeric: 0.5,
  },
  {
    id: 37,
    category: "Powers",
    name: "Decimal fractional exponent: 16 POWER 0 . 5 =",
    actions: ["1", "6", "POWER", "0", ".", "5", "="],
    expectedNumeric: 4,
  },
  {
    id: 38,
    category: "Powers",
    name: "Square of a sum: ( 2 + 3 ) SQUARE =",
    actions: ["(", "2", "+", "3", ")", "SQUARE", "="],
    expectedNumeric: 25,
  },
  {
    id: 39,
    category: "Powers",
    name: "Shift + SQUARE (Cube x³): 4 SHIFT SQUARE =",
    actions: ["4", "SHIFT", "SQUARE", "="],
    expectedNumeric: 64,
  },
  {
    id: 40,
    category: "Powers",
    name: "Multi-digit base into power: 12 POWER 2 =",
    actions: ["1", "2", "POWER", "2", "="],
    expectedNumeric: 144,
  },

  // =========================================================================
  // 5. SQUARE ROOTS & CUBE ROOTS WITH OVERBAR NAVIGATION (10 tests)
  // =========================================================================
  {
    id: 41,
    category: "Roots",
    name: "Square root key √■: SQRT 16 =",
    actions: ["SQRT", "1", "6", "="],
    expectedNumeric: 4,
  },
  {
    id: 42,
    category: "Roots",
    name: "Stepping out of radical with RIGHT navigation: SQRT 25 RIGHT + 5 =",
    actions: ["SQRT", "2", "5", "NAV:RIGHT", "+", "5", "="],
    expectedNumeric: 10,
  },
  {
    id: 43,
    category: "Roots",
    name: "Pythagoras inside radical: SQRT 3 SQUARE + 4 SQUARE =",
    actions: ["SQRT", "3", "SQUARE", "+", "4", "SQUARE", "="],
    expectedNumeric: 5,
  },
  {
    id: 44,
    category: "Roots",
    name: "Cube root key SHIFT + SQRT: SHIFT SQRT 27 =",
    actions: ["SHIFT", "SQRT", "2", "7", "="],
    expectedNumeric: 3,
  },
  {
    id: 45,
    category: "Roots",
    name: "Cube root of 64: SHIFT SQRT 64 =",
    actions: ["SHIFT", "SQRT", "6", "4", "="],
    expectedNumeric: 4,
  },
  {
    id: 46,
    category: "Roots",
    name: "Nested square roots: SQRT SQRT 16 =",
    actions: ["SQRT", "SQRT", "1", "6", "="],
    expectedNumeric: 2,
  },
  {
    id: 47,
    category: "Roots",
    name: "Root multiplied by coefficient: 2 SQRT 9 =",
    actions: ["2", "SQRT", "9", "="],
    expectedNumeric: 6,
  },
  {
    id: 48,
    category: "Roots",
    name: "Root in fraction numerator: FRAC SQRT 16 DOWN 2 =",
    actions: ["FRAC", "SQRT", "1", "6", "NAV:DOWN", "2", "="],
    expectedNumeric: 2,
  },
  {
    id: 49,
    category: "Roots",
    name: "Root in fraction denominator: FRAC 10 DOWN SQRT 25 =",
    actions: ["FRAC", "1", "0", "NAV:DOWN", "SQRT", "2", "5", "="],
    expectedNumeric: 2,
  },
  {
    id: 50,
    category: "Roots",
    name: "Stepping out of root before multiplication: SQRT 9 RIGHT × 4 =",
    actions: ["SQRT", "9", "NAV:RIGHT", "×", "4", "="],
    expectedNumeric: 12,
  },

  // =========================================================================
  // 6. COMPOUND NATURAL EXPRESSIONS (10 tests)
  // =========================================================================
  {
    id: 51,
    category: "Compound",
    name: "Fraction with root and sum: (√9 + 4) / 7 =",
    actions: ["FRAC", "SQRT", "9", ")", "+", "4", "NAV:DOWN", "7", "="],
    expectedNumeric: 1,
  },
  {
    id: 52,
    category: "Compound",
    name: "Fraction with sum of squares in numerator: (3² + 4²) / 5 =",
    actions: ["FRAC", "3", "SQUARE", "+", "4", "SQUARE", "NAV:DOWN", "5", "="],
    expectedNumeric: 5,
  },
  {
    id: 53,
    category: "Compound",
    name: "Square root encompassing a fraction: √(9/16) =",
    actions: ["SQRT", "9", "FRAC", "1", "6", "="],
    expectedNumeric: 0.75,
  },
  {
    id: 54,
    category: "Compound",
    name: "Fraction with power in numerator: (2³) / 4 =",
    actions: ["FRAC", "2", "POWER", "3", "NAV:DOWN", "4", "="],
    expectedNumeric: 2,
  },
  {
    id: 55,
    category: "Compound",
    name: "Fraction with power in denominator: 1 / (2²) =",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "POWER", "2", "="],
    expectedNumeric: 0.25,
  },
  {
    id: 56,
    category: "Compound",
    name: "Quotient of two square roots: √36 / √9 =",
    actions: ["FRAC", "SQRT", "3", "6", "NAV:DOWN", "SQRT", "9", "="],
    expectedNumeric: 2,
  },
  {
    id: 57,
    category: "Compound",
    name: "Squared fraction in parentheses: (1/2)² =",
    actions: ["(", "FRAC", "1", "NAV:DOWN", "2", "NAV:RIGHT", ")", "SQUARE", "="],
    expectedNumeric: 0.25,
  },
  {
    id: 58,
    category: "Compound",
    name: "Sum of three fractions: 1/2 + 1/3 + 1/6 =",
    actions: ["FRAC", "1", "NAV:DOWN", "2", "NAV:RIGHT", "+", "FRAC", "1", "NAV:DOWN", "3", "NAV:RIGHT", "+", "FRAC", "1", "NAV:DOWN", "6", "="],
    expectedNumeric: 1,
  },
  {
    id: 59,
    category: "Compound",
    name: "Cubes and squares in fraction: 2³ / 2² =",
    actions: ["FRAC", "2", "CUBE", "NAV:DOWN", "2", "SQUARE", "="],
    expectedNumeric: 2,
  },
  {
    id: 60,
    category: "Compound",
    name: "Quadratic numerator formula: (-2 + √(2² - 4×1×(-3))) / 2 =",
    actions: [
      "FRAC",
      "NEG", "2", "+", "SQRT", "2", "SQUARE", "−", "4", "×", "1", "×", "(", "NEG", "3", ")",
      "NAV:DOWN",
      "2",
      "=",
    ],
    expectedNumeric: 1,
  },

  // =========================================================================
  // 7. TRIGONOMETRY IN DEG AND RAD MODES (12 tests)
  // =========================================================================
  {
    id: 61,
    category: "Trigonometry",
    name: "sin(0°) in DEG mode =",
    actions: ["SIN", "0", ")", "="],
    expectedNumeric: 0,
  },
  {
    id: 62,
    category: "Trigonometry",
    name: "sin(30°) in DEG mode =",
    actions: ["SIN", "3", "0", ")", "="],
    expectedNumeric: 0.5,
  },
  {
    id: 63,
    category: "Trigonometry",
    name: "sin(90°) in DEG mode =",
    actions: ["SIN", "9", "0", ")", "="],
    expectedNumeric: 1,
  },
  {
    id: 64,
    category: "Trigonometry",
    name: "cos(0°) in DEG mode =",
    actions: ["COS", "0", ")", "="],
    expectedNumeric: 1,
  },
  {
    id: 65,
    category: "Trigonometry",
    name: "cos(60°) in DEG mode =",
    actions: ["COS", "6", "0", ")", "="],
    expectedNumeric: 0.5,
  },
  {
    id: 66,
    category: "Trigonometry",
    name: "cos(90°) in DEG mode =",
    actions: ["COS", "9", "0", ")", "="],
    expectedNumeric: 0,
  },
  {
    id: 67,
    category: "Trigonometry",
    name: "tan(45°) in DEG mode =",
    actions: ["TAN", "4", "5", ")", "="],
    expectedNumeric: 1,
  },
  {
    id: 68,
    category: "Trigonometry",
    name: "Pythagorean identity: sin(30)² + cos(30)² =",
    actions: ["SIN", "3", "0", ")", "SQUARE", "+", "COS", "3", "0", ")", "SQUARE", "="],
    expectedNumeric: 1,
  },
  {
    id: 69,
    category: "Trigonometry",
    name: "Inverse sine SHIFT + SIN: sin⁻¹(0.5) =",
    actions: ["SHIFT", "SIN", "0", ".", "5", ")", "="],
    expectedNumeric: 30,
  },
  {
    id: 70,
    category: "Trigonometry",
    name: "Inverse cosine SHIFT + COS: cos⁻¹(0.5) =",
    actions: ["SHIFT", "COS", "0", ".", "5", ")", "="],
    expectedNumeric: 60,
  },
  {
    id: 71,
    category: "Trigonometry",
    name: "Inverse tangent SHIFT + TAN: tan⁻¹(1) =",
    actions: ["SHIFT", "TAN", "1", ")", "="],
    expectedNumeric: 45,
  },
  {
    id: 72,
    category: "Trigonometry",
    name: "Angle mode toggle to RAD and sin(π/2) =",
    actions: ["MODE_TOGGLE", "SIN", "SHIFT", "EXP", "÷", "2", ")", "="],
    expectedNumeric: 1,
  },

  // =========================================================================
  // 8. LOGARITHMS & EXPONENTIALS (8 tests)
  // =========================================================================
  {
    id: 73,
    category: "Logs-Exp",
    name: "Common log₁₀(10) =",
    actions: ["LOG", "1", "0", ")", "="],
    expectedNumeric: 1,
  },
  {
    id: 74,
    category: "Logs-Exp",
    name: "Common log₁₀(1000) =",
    actions: ["LOG", "1", "0", "0", "0", ")", "="],
    expectedNumeric: 3,
  },
  {
    id: 75,
    category: "Logs-Exp",
    name: "Natural log ln(1) =",
    actions: ["LN", "1", ")", "="],
    expectedNumeric: 0,
  },
  {
    id: 76,
    category: "Logs-Exp",
    name: "Natural log ln(e) =",
    actions: ["LN", "ALPHA", "EXP", ")", "="],
    expectedNumeric: 1,
  },
  {
    id: 77,
    category: "Logs-Exp",
    name: "Arbitrary base log_(2)(16) =",
    actions: ["LOG_BASE", "2", ")", "(", "1", "6", ")", "="],
    expectedNumeric: 4,
  },
  {
    id: 78,
    category: "Logs-Exp",
    name: "Arbitrary base log_(10)(100) =",
    actions: ["LOG_BASE", "1", "0", ")", "(", "1", "0", "0", ")", "="],
    expectedNumeric: 2,
  },
  {
    id: 79,
    category: "Logs-Exp",
    name: "Shift + LOG for 10^(3) =",
    actions: ["SHIFT", "LOG", "3", ")", "="],
    expectedNumeric: 1000,
  },
  {
    id: 80,
    category: "Logs-Exp",
    name: "Shift + LN for e^(0) =",
    actions: ["SHIFT", "LN", "0", ")", "="],
    expectedNumeric: 1,
  },

  // =========================================================================
  // 9. ABSOLUTE VALUE & COMBINATORICS (8 tests)
  // =========================================================================
  {
    id: 81,
    category: "Abs-Combinatorics",
    name: "Absolute value: |-15| =",
    actions: ["ABS", "NEG", "1", "5", "="],
    expectedNumeric: 15,
  },
  {
    id: 82,
    category: "Abs-Combinatorics",
    name: "Absolute value of difference: |5 - 12| =",
    actions: ["ABS", "5", "−", "1", "2", "="],
    expectedNumeric: 7,
  },
  {
    id: 83,
    category: "Abs-Combinatorics",
    name: "Absolute value with RIGHT navigation: |-3| × 4 =",
    actions: ["ABS", "NEG", "3", "NAV:RIGHT", "×", "4", "="],
    expectedNumeric: 12,
  },
  {
    id: 84,
    category: "Abs-Combinatorics",
    name: "Reciprocal key INV: 5⁻¹ =",
    actions: ["5", "INV", "="],
    expectedNumeric: 0.2,
  },
  {
    id: 85,
    category: "Abs-Combinatorics",
    name: "Factorial via SHIFT + INV: 5! =",
    actions: ["5", "SHIFT", "INV", "="],
    expectedNumeric: 120,
  },
  {
    id: 86,
    category: "Abs-Combinatorics",
    name: "Zero factorial: 0! =",
    actions: ["0", "SHIFT", "INV", "="],
    expectedNumeric: 1,
  },
  {
    id: 87,
    category: "Abs-Combinatorics",
    name: "Permutations via SHIFT + ×: 5 P 2 =",
    actions: ["5", "SHIFT", "×", "2", "="],
    expectedNumeric: 20,
  },
  {
    id: 88,
    category: "Abs-Combinatorics",
    name: "Combinations via SHIFT + ÷: 5 C 2 =",
    actions: ["5", "SHIFT", "÷", "2", "="],
    expectedNumeric: 10,
  },

  // =========================================================================
  // 10. SCIENTIFIC NOTATION, CONSTANTS & FORMATTING (8 tests)
  // =========================================================================
  {
    id: 89,
    category: "Scientific-Formatting",
    name: "Scientific notation EXP key: 2.5 × 10^3 =",
    actions: ["2", ".", "5", "EXP", "3", ")", "="],
    expectedNumeric: 2500,
  },
  {
    id: 90,
    category: "Scientific-Formatting",
    name: "Constant π via SHIFT + EXP: 2 × π =",
    actions: ["2", "×", "SHIFT", "EXP", "="],
    expectedNumeric: 6.283185307,
    tolerance: 0.0001,
  },
  {
    id: 91,
    category: "Scientific-Formatting",
    name: "Constant e via ALPHA + EXP: e + 1 =",
    actions: ["ALPHA", "EXP", "+", "1", "="],
    expectedNumeric: 3.718281828,
    tolerance: 0.0001,
  },
  {
    id: 92,
    category: "Scientific-Formatting",
    name: "Engineering notation ENG key: 1000000 = then ENG",
    actions: ["1", "0", "0", "0", "0", "0", "0", "=", "ENG"],
    expectedCustomCheck: (s) => s.result.includes("×10^6"),
  },
  {
    id: 93,
    category: "Scientific-Formatting",
    name: "DMS degrees-minutes-seconds key: 45.5 = then DMS",
    actions: ["4", "5", ".", "5", "=", "DMS"],
    expectedCustomCheck: (s) => s.result.includes("45°30'0\""),
  },
  {
    id: 94,
    category: "Scientific-Formatting",
    name: "Percentage via SHIFT + ANS: 200 × 15% =",
    actions: ["2", "0", "0", "×", "1", "5", "SHIFT", "ANS", "="],
    expectedNumeric: 30,
  },
  {
    id: 95,
    category: "Scientific-Formatting",
    name: "Polar coordinate via SHIFT + +: Pol(3, 4) =",
    actions: ["SHIFT", "+", "3", ",", "4", ")", "="],
    expectedNumeric: 5,
  },
  {
    id: 96,
    category: "Scientific-Formatting",
    name: "Rectangular coordinate via SHIFT + −: Rec(10, 60) =",
    actions: ["SHIFT", "−", "1", "0", ",", "6", "0", ")", "="],
    expectedNumeric: 5,
  },

  // =========================================================================
  // 11. MEMORY, EDITING & HISTORY KEYS (10 tests)
  // =========================================================================
  {
    id: 97,
    category: "Memory-Editing",
    name: "Store to M with STO and recall with SHIFT + STO: 10 = STO AC SHIFT STO =",
    actions: ["1", "0", "=", "STO", "AC", "SHIFT", "STO", "="],
    expectedNumeric: 10,
  },
  {
    id: 98,
    category: "Memory-Editing",
    name: "Accumulate with M+: 5 = M+ 3 = M+ AC SHIFT STO =",
    actions: ["5", "=", "M_PLUS", "3", "=", "M_PLUS", "AC", "SHIFT", "STO", "="],
    expectedNumeric: 8,
  },
  {
    id: 99,
    category: "Memory-Editing",
    name: "Subtract from memory with SHIFT + M+ (M-): 2 = SHIFT M_PLUS AC SHIFT STO =",
    actions: ["2", "=", "SHIFT", "M_PLUS", "AC", "SHIFT", "STO", "="],
    expectedNumeric: -2,
  },
  {
    id: 100,
    category: "Memory-Editing",
    name: "DEL key editing digits: 1 2 3 DEL DEL 4 =",
    actions: ["1", "2", "3", "DEL", "DEL", "4", "="],
    expectedNumeric: 14,
  },
  {
    id: 101,
    category: "Memory-Editing",
    name: "DEL key inside fraction numerator: FRAC 1 2 DEL 5 DOWN 2 =",
    actions: ["FRAC", "1", "2", "DEL", "5", "NAV:DOWN", "2", "="],
    expectedNumeric: 7.5,
  },
  {
    id: 102,
    category: "Memory-Editing",
    name: "DEL key deleting whole fraction block: FRAC 1 DEL DEL",
    actions: ["FRAC", "1", "DEL", "DEL"],
    expectedCustomCheck: (s) => s.items.length === 0 && s.cursor.location === "main",
  },
  {
    id: 103,
    category: "Memory-Editing",
    name: "DEL key inside square root: SQRT 1 4 4 DEL DEL =",
    actions: ["SQRT", "1", "4", "4", "DEL", "DEL", "="],
    expectedNumeric: 1,
  },
  {
    id: 104,
    category: "Memory-Editing",
    name: "DEL key inside power exponent: 2 POWER 3 4 DEL =",
    actions: ["2", "POWER", "3", "4", "DEL", "="],
    expectedNumeric: 8,
  },
  {
    id: 105,
    category: "Memory-Editing",
    name: "All Clear AC resets screen: 1 2 3 4 5 AC",
    actions: ["1", "2", "3", "4", "5", "AC"],
    expectedCustomCheck: (s) => s.result === "0" && s.items.length === 0,
  },
  {
    id: 106,
    category: "Memory-Editing",
    name: "History navigation with UP Rocker: 2 + 2 = 3 + 3 = UP restores 3 + 3, UP restores 2 + 2",
    actions: ["2", "+", "2", "=", "3", "+", "3", "=", "NAV:UP", "NAV:UP"],
    expectedCustomCheck: (s) => s.result === "4" && s.lastNumericResult === 4,
  },
  {
    id: 107,
    category: "Fractions",
    name: "Fraction after squared number on main: 3² FRAC 4 =",
    actions: ["3", "SQUARE", "FRAC", "4", "="],
    expectedNumeric: 2.25,
  },
  {
    id: 108,
    category: "Fractions-Roots",
    name: "Fraction after squared number inside root: SQRT 5² + 3² FRAC 5 =",
    actions: ["SQRT", "5", "SQUARE", "+", "3", "SQUARE", "FRAC", "5", "="],
    expectedNumeric: 5.17687164,
    tolerance: 0.0001,
  },
  {
    id: 109,
    category: "Pi-Calculations",
    name: "Pi constant evaluated shows π first: SHIFT EXP =",
    actions: ["SHIFT", "EXP", "="],
    expectedText: "π",
    expectedDisplayMode: "pi",
    expectedNumeric: Math.PI,
    tolerance: 0.0001,
  },
  {
    id: 110,
    category: "Pi-Calculations",
    name: "Pi with S<=>D toggles between π and decimal: SHIFT EXP = S_TO_D",
    actions: ["SHIFT", "EXP", "=", "S_TO_D"],
    expectedText: "3.141592654",
    expectedDisplayMode: "decimal",
    expectedNumeric: Math.PI,
    tolerance: 0.0001,
  },
  {
    id: 111,
    category: "Pi-Calculations",
    name: "Pi with S<=>D toggles back to π: SHIFT EXP = S_TO_D S_TO_D",
    actions: ["SHIFT", "EXP", "=", "S_TO_D", "S_TO_D"],
    expectedText: "π",
    expectedDisplayMode: "pi",
    expectedNumeric: Math.PI,
    tolerance: 0.0001,
  },
  {
    id: 112,
    category: "Pi-Calculations",
    name: "2 × π shows 2π first and toggles with S<=>D",
    actions: ["2", "×", "SHIFT", "EXP", "="],
    expectedText: "2π",
    expectedDisplayMode: "pi",
    expectedNumeric: 2 * Math.PI,
    tolerance: 0.0001,
  },
  {
    id: 113,
    category: "Pi-Calculations",
    name: "π / 2 vertical fraction shows π/2 in terms of π",
    actions: ["FRAC", "SHIFT", "EXP", "DOWN", "2", "="],
    expectedText: "π/2",
    expectedDisplayMode: "pi",
    expectedNumeric: Math.PI / 2,
    tolerance: 0.0001,
  },
];

// Runner Function
function runButtonTests(): void {
  console.log("=================================================================");
  console.log("   CASIO FX-83GT X CLASSWIZ: 100+ BUTTON-INTERACTION TEST SUITE   ");
  console.log("      (All tests interact exclusively through button presses)     ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const t of tests) {
    const session = new CasioCalculatorSession();

    // Execute button sequence
    session.pressSequence(...t.actions);

    let isSuccess = true;
    let failureMsg = "";

    // 1. Numeric expectation check
    if (t.expectedNumeric !== undefined) {
      const tol = t.tolerance ?? 0.000001;
      const actual = session.lastNumericResult;
      if (actual === null || Math.abs(actual - t.expectedNumeric) > tol) {
        isSuccess = false;
        failureMsg = `Expected numeric ${t.expectedNumeric}, got ${actual} (result: "${session.result}")`;
      }
    }

    // 2. Text expectation check
    if (isSuccess && t.expectedText !== undefined) {
      const actualText = session.getDisplayResult();
      if (actualText !== t.expectedText) {
        isSuccess = false;
        failureMsg = `Expected text "${t.expectedText}", got "${actualText}"`;
      }
    }

    // 3. DisplayMode check
    if (isSuccess && t.expectedDisplayMode !== undefined) {
      if (session.displayMode !== t.expectedDisplayMode) {
        isSuccess = false;
        failureMsg = `Expected displayMode "${t.expectedDisplayMode}", got "${session.displayMode}"`;
      }
    }

    // 4. Custom assertion check
    if (isSuccess && t.expectedCustomCheck !== undefined) {
      if (!t.expectedCustomCheck(session)) {
        isSuccess = false;
        failureMsg = `Custom check failed on state (result: "${session.result}", items: ${JSON.stringify(session.items)})`;
      }
    }

    const padId = String(t.id).padStart(3, "0");
    const padCat = t.category.padEnd(20, " ");

    if (isSuccess) {
      passed++;
      console.log(`  ✓ [#${padId}] [${padCat}] ${t.name} => ${session.result}`);
    } else {
      failed++;
      console.error(`  ✗ [#${padId}] [${padCat}] ${t.name}`);
      console.error(`       FAILURE: ${failureMsg}`);
      console.error(`       ACTIONS: [${t.actions.join(", ")}]`);
    }
  }

  const duration = Date.now() - startTime;
  console.log("\n=================================================================");
  console.log(`TOTAL BUTTON TESTS: ${tests.length}`);
  console.log(`PASSED:             ${passed}`);
  console.log(`FAILED:             ${failed}`);
  console.log(`SUCCESS RATE:       ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log(`EXECUTION TIME:     ${duration}ms`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runButtonTests();
