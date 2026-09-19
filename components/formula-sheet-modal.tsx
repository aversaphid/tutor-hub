"use client";

import React, { useState } from "react";
import {
  X,
  Search,
  Calculator,
  Check,
  Copy,
  ExternalLink,
  BookOpen,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react";

/**
 * Proper mathematical fraction component with horizontal vinculum (bar)
 * vertically aligned to the mathematical center line.
 */
function Fraction({
  num,
  den,
  className = "",
}: {
  num: React.ReactNode;
  den: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex flex-col items-center justify-center align-middle mx-1 text-center leading-none ${className}`}
      style={{ verticalAlign: "-0.45em" }}
    >
      <span className="border-b border-current pb-[2px] px-1 text-[0.92em] font-bold block whitespace-nowrap">
        {num}
      </span>
      <span className="pt-[2px] px-1 text-[0.92em] font-bold block whitespace-nowrap">
        {den}
      </span>
    </span>
  );
}

interface FormulaItem {
  name: string;
  category: "algebra" | "trig" | "calculus" | "stats" | "mechanics" | "sequences";
  level: "GCSE" | "A-Level" | "Both";
  formula: string; // Plain text string for clipboard copy
  formatted?: React.ReactNode; // Beautiful stacked fraction display
  notes?: string;
}

interface ExamBoardDoc {
  name: string;
  examBoard: "Edexcel" | "AQA" | "OCR";
  level: "GCSE" | "A-Level";
  description: string;
  url: string;
  badgeColor: string;
}

const FORMULAS: FormulaItem[] = [
  // Algebra & Quadratics
  {
    name: "Quadratic Formula",
    category: "algebra",
    level: "GCSE",
    formula: "x = (-b ± √(b² - 4ac)) / (2a)",
    formatted: (
      <span className="inline-flex items-center flex-wrap">
        x ={" "}
        <Fraction
          num={<>-b ± √(b² - 4ac)</>}
          den={<>2a</>}
        />
      </span>
    ),
    notes: "For any equation in the form ax² + bx + c = 0. If b² - 4ac < 0, there are no real solutions.",
  },
  {
    name: "Difference of Two Squares",
    category: "algebra",
    level: "GCSE",
    formula: "a² - b² = (a - b)(a + b)",
    formatted: <span>a² - b² = (a - b)(a + b)</span>,
    notes: "Essential for rapid factorising and algebraic fractions.",
  },
  {
    name: "Completing the Square",
    category: "algebra",
    level: "GCSE",
    formula: "x² + bx + c = (x + b/2)² - (b/2)² + c",
    formatted: (
      <span className="inline-flex items-center flex-wrap">
        x² + bx + c = (x + <Fraction num="b" den="2" />)² - (<Fraction num="b" den="2" />)² + c
      </span>
    ),
    notes: "Turning point of the parabola is at (-b/2, c - (b/2)²).",
  },
  {
    name: "Laws of Indices",
    category: "algebra",
    level: "GCSE",
    formula: "aᵐ × aⁿ = aᵐ⁺ⁿ  or  aᵐ ÷ aⁿ = aᵐ⁻ⁿ  or  (aᵐ)ⁿ = aᵐⁿ  or  a⁻ⁿ = 1/aⁿ  or  a^(m/n) = ⁿ√(aᵐ)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>aᵐ × aⁿ = aᵐ⁺ⁿ</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>aᵐ ÷ aⁿ = aᵐ⁻ⁿ</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>(aᵐ)ⁿ = aᵐⁿ</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>a⁻ⁿ = <Fraction num="1" den={<>aⁿ</>} /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>a^(m/n) = ⁿ√(aᵐ)</span>
      </span>
    ),
    notes: "Also note that any non-zero number to power 0 is 1 (a⁰ = 1).",
  },
  {
    name: "Equation of a Straight Line & Gradient",
    category: "algebra",
    level: "GCSE",
    formula: "y = mx + c  or  y - y₁ = m(x - x₁)  or  m = (y₂ - y₁) / (x₂ - x₁)  or  m_perpendicular = -1/m",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>y = mx + c</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>y - y₁ = m(x - x₁)</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>m = <Fraction num="y₂ - y₁" den="x₂ - x₁" /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>m_⟂ = <Fraction num="-1" den="m" /></span>
      </span>
    ),
    notes: "Perpendicular line gradient is the negative reciprocal: m₁ × m₂ = -1.",
  },

  // Trigonometry & Geometry
  {
    name: "Pythagoras' Theorem",
    category: "trig",
    level: "GCSE",
    formula: "a² + b² = c²  =>  c = √(a² + b²)",
    formatted: <span>a² + b² = c²  ⇒  c = √(a² + b²)</span>,
    notes: "In right-angled triangles where c is the hypotenuse.",
  },
  {
    name: "Trigonometric Ratios (SOH CAH TOA)",
    category: "trig",
    level: "GCSE",
    formula: "sin(θ) = Opp/Hyp  or  cos(θ) = Adj/Hyp  or  tan(θ) = Opp/Adj",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>sin(θ) = <Fraction num="Opp" den="Hyp" /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>cos(θ) = <Fraction num="Adj" den="Hyp" /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>tan(θ) = <Fraction num="Opp" den="Adj" /></span>
      </span>
    ),
    notes: "Remember tan(θ) = sin(θ) / cos(θ) and sin²(θ) + cos²(θ) = 1.",
  },
  {
    name: "The Sine Rule",
    category: "trig",
    level: "GCSE",
    formula: "a / sin(A) = b / sin(B) = c / sin(C)  or  sin(A) / a = sin(B) / b = sin(C) / c",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>For sides:</span>
        <Fraction num="a" den="sin(A)" /> = <Fraction num="b" den="sin(B)" /> = <Fraction num="c" den="sin(C)" />
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>For angles:</span>
        <Fraction num="sin(A)" den="a" /> = <Fraction num="sin(B)" den="b" /> = <Fraction num="sin(C)" den="c" />
      </span>
    ),
    notes: "Use for finding sides. Invert for angles: sin(A)/a = sin(B)/b. Beware ambiguous case for obtuse angles.",
  },
  {
    name: "The Cosine Rule",
    category: "trig",
    level: "GCSE",
    formula: "a² = b² + c² - 2bc cos(A)   =>   cos(A) = (b² + c² - a²) / (2bc)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>a² = b² + c² - 2bc cos(A)</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">⇒</span>
        <span>cos(A) = <Fraction num={<>b² + c² - a²</>} den="2bc" /></span>
      </span>
    ),
    notes: "Use when you have 3 sides (SSS) or 2 sides and the included angle (SAS).",
  },
  {
    name: "Area of Any Triangle",
    category: "trig",
    level: "GCSE",
    formula: "Area = 1/2 a b sin(C)",
    formatted: (
      <span className="inline-flex items-center">
        Area = <Fraction num="1" den="2" /> a b sin(C)
      </span>
    ),
    notes: "Where C is the included angle between sides a and b.",
  },
  {
    name: "Circles: Area, Circumference, Arc & Sector",
    category: "trig",
    level: "GCSE",
    formula: "Area = πr²  or  Circumference = 2πr = πd  or  Arc = (θ/360) × 2πr  or  Sector = (θ/360) × πr²",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>Area = πr²</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Circumference = 2πr = πd</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Arc = <Fraction num="θ" den="360°" /> × 2πr</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Sector = <Fraction num="θ" den="360°" /> × πr²</span>
      </span>
    ),
    notes: "For radians: Arc = r θ, Sector Area = ½ r² θ.",
  },
  {
    name: "Volume & Surface Area of Sphere & Cone",
    category: "trig",
    level: "GCSE",
    formula: "Sphere V = 4/3 πr³, SA = 4πr²  or  Cone V = 1/3 πr²h, Curved SA = πrl",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>Sphere: V = <Fraction num="4" den="3" />πr³, SA = 4πr²</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Cone: V = <Fraction num="1" den="3" />πr²h, Curved SA = πrl</span>
      </span>
    ),
    notes: "Where l is the slant height: l² = r² + h².",
  },
  {
    name: "Key Circle Theorems",
    category: "trig",
    level: "GCSE",
    formula: "∠ Centre = 2 × ∠ Circumference  or  ∠ in Semicircle = 90°  or  Cyclic Quad Opp ∠s = 180°",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>∠ Centre = 2 × ∠ Circumference</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>∠ in Semicircle = 90°</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Cyclic Quad Opp ∠s = 180°</span>
      </span>
    ),
    notes: "Also: Angles in same segment equal; Tangent meets radius at 90°; Alternate segment theorem.",
  },

  // Calculus (A-Level)
  {
    name: "Differentiation / Power Rule",
    category: "calculus",
    level: "Both",
    formula: "d/dx (xⁿ) = n xⁿ⁻¹  or  d/dx (c) = 0  or  ∫ xⁿ dx = xⁿ⁺¹ / (n + 1) + C",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span><Fraction num="d" den="dx" />(xⁿ) = n xⁿ⁻¹</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span><Fraction num="d" den="dx" />(c) = 0</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>∫ xⁿ dx = <Fraction num="xⁿ⁺¹" den="n + 1" /> + C (n ≠ -1)</span>
      </span>
    ),
    notes: "Multiply by power, reduce power by 1. For integration: add 1 to power and divide by new power.",
  },
  {
    name: "Exponential & Logarithmic Derivatives",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (eᵏˣ) = k eᵏˣ  or  d/dx (ln x) = 1/x  or  d/dx (aˣ) = aˣ ln(a)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span><Fraction num="d" den="dx" />(eᵏˣ) = k eᵏˣ</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span><Fraction num="d" den="dx" />(ln x) = <Fraction num="1" den="x" /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span><Fraction num="d" den="dx" />(aˣ) = aˣ ln(a)</span>
      </span>
    ),
    notes: "Integral of 1/x is ln|x| + C.",
  },
  {
    name: "Trigonometric Derivatives",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (sin x) = cos x  or  d/dx (cos x) = -sin x  or  d/dx (tan x) = sec²(x)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span><Fraction num="d" den="dx" />(sin x) = cos x</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span><Fraction num="d" den="dx" />(cos x) = -sin x</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span><Fraction num="d" den="dx" />(tan x) = sec²(x)</span>
      </span>
    ),
    notes: "Ensure angles are always in radians when applying calculus rules!",
  },
  {
    name: "Product Rule & Quotient Rule",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (uv) = u(dv/dx) + v(du/dx)  or  d/dx (u/v) = (v(du/dx) - u(dv/dx)) / v²",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>
          <Fraction num="d" den="dx" />(uv) = u <Fraction num="dv" den="dx" /> + v <Fraction num="du" den="dx" />
        </span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>
          <Fraction num="d" den="dx" />(<Fraction num="u" den="v" />) ={" "}
          <Fraction
            num={<>v <Fraction num="du" den="dx" /> - u <Fraction num="dv" den="dx" /></>}
            den="v²"
          />
        </span>
      </span>
    ),
    notes: "Quotient rule: (Lo d-Hi - Hi d-Lo) / (Lo)². Chain rule: dy/dx = (dy/du) × (du/dx).",
  },
  {
    name: "Integration by Parts",
    category: "calculus",
    level: "A-Level",
    formula: "∫ u (dv/dx) dx = u v - ∫ v (du/dx) dx",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2">
        <span>
          ∫ u <Fraction num="dv" den="dx" /> dx = u v - ∫ v <Fraction num="du" den="dx" /> dx
        </span>
      </span>
    ),
    notes: "L.I.A.T.E. guide for picking u: Logarithms, Inverse trig, Algebraic, Trigonometric, Exponential.",
  },

  // Probability & Statistics
  {
    name: "Probability: Addition & Multiplication Rules",
    category: "stats",
    level: "Both",
    formula: "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)   or   P(A ∩ B) = P(A) × P(B|A)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>P(A ∪ B) = P(A) + P(B) - P(A ∩ B)</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>P(A ∩ B) = P(A) × P(B|A)</span>
      </span>
    ),
    notes: "If mutually exclusive: P(A ∩ B) = 0. If independent: P(A ∩ B) = P(A) × P(B).",
  },
  {
    name: "Conditional Probability",
    category: "stats",
    level: "Both",
    formula: "P(A|B) = P(A ∩ B) / P(B)",
    formatted: (
      <span className="inline-flex items-center">
        P(A|B) = <Fraction num="P(A ∩ B)" den="P(B)" />
      </span>
    ),
    notes: "Probability of event A occurring given that event B has already occurred.",
  },
  {
    name: "Binomial Distribution",
    category: "stats",
    level: "A-Level",
    formula: "P(X = r) = ⁿCᵣ × pʳ × (1 - p)ⁿ⁻ʳ  or  Mean μ = np  or  Variance σ² = np(1 - p)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>P(X = r) = ⁿCᵣ × pʳ × (1 - p)ⁿ⁻ʳ</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Mean μ = np</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Variance σ² = np(1 - p)</span>
      </span>
    ),
    notes: "Mean = np, Variance = np(1-p). Requires fixed n trials, independent trials, 2 outcomes, constant p.",
  },
  {
    name: "Normal Distribution Standardisation",
    category: "stats",
    level: "A-Level",
    formula: "Z = (X - μ) / σ",
    formatted: (
      <span className="inline-flex items-center">
        Z = <Fraction num="X - μ" den="σ" />
        <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
          where X ~ N(μ, σ²) ⇒ Z ~ N(0, 1)
        </span>
      </span>
    ),
    notes: "Transforms normal variable X ~ N(μ, σ²) to standard normal Z ~ N(0, 1).",
  },

  // Mechanics & Kinematics (SUVAT)
  {
    name: "Constant Acceleration Equations (SUVAT)",
    category: "mechanics",
    level: "Both",
    formula: "v = u + at  or  s = 1/2(u + v)t  or  s = ut + 1/2at²  or  v² = u² + 2as  or  s = vt - 1/2at²",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>v = u + at</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>s = <Fraction num="1" den="2" />(u + v)t</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>s = ut + <Fraction num="1" den="2" />at²</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>v² = u² + 2as</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>s = vt - <Fraction num="1" den="2" />at²</span>
      </span>
    ),
    notes: "Only valid for constant acceleration. Adopt a consistent positive direction for vectors (s, u, v, a).",
  },
  {
    name: "Newton's Second Law & Weight",
    category: "mechanics",
    level: "Both",
    formula: "F_net = m a  or  W = m g (g ≈ 9.8 m/s²)  or  Momentum p = m v  or  Impulse = F Δt = m Δv",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>F_net = m a</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>W = m g (g ≈ 9.8 m/s²)</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Momentum p = m v</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Impulse = F Δt = m Δv</span>
      </span>
    ),
    notes: "Resultant force F is in the direction of acceleration. Mass m is in kg.",
  },
  {
    name: "Friction & Limiting Equilibrium",
    category: "mechanics",
    level: "A-Level",
    formula: "F_max = μ R   (In general: F_friction ≤ μ R)",
    formatted: (
      <span>F_max = μ R  <span className="text-xs font-normal text-slate-500">(In general: F_friction ≤ μ R)</span></span>
    ),
    notes: "μ is coefficient of friction, R is normal reaction. Maximum friction reached when sliding or on point of slip.",
  },
  {
    name: "Moments of a Force",
    category: "mechanics",
    level: "A-Level",
    formula: "Moment = Force × Perpendicular distance to pivot (d_⟂)",
    formatted: <span>Moment = Force × Perpendicular distance to pivot (d_⟂)</span>,
    notes: "For rotational equilibrium: Total Clockwise Moments = Total Counter-Clockwise Moments.",
  },

  // Sequences & Series
  {
    name: "Arithmetic Progressions (AP)",
    category: "sequences",
    level: "Both",
    formula: "uₙ = a + (n - 1)d  or  Sₙ = n/2 [2a + (n - 1)d] = n/2 (a + l)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>uₙ = a + (n - 1)d</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>
          Sₙ = <Fraction num="n" den="2" /> [2a + (n - 1)d] = <Fraction num="n" den="2" /> (a + l)
        </span>
      </span>
    ),
    notes: "a is first term, d is common difference, l is last term uₙ.",
  },
  {
    name: "Geometric Progressions (GP)",
    category: "sequences",
    level: "A-Level",
    formula: "uₙ = a rⁿ⁻¹  or  Sₙ = a(1 - rⁿ) / (1 - r)  or  S_∞ = a / (1 - r)",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-2 gap-y-1">
        <span>uₙ = a rⁿ⁻¹</span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>Sₙ = <Fraction num={<>a(1 - rⁿ)</>} den="1 - r" /></span>
        <span className="text-slate-400 font-normal text-[0.85em] px-0.5">or</span>
        <span>S_∞ = <Fraction num="a" den="1 - r" /> (|r| &lt; 1)</span>
      </span>
    ),
    notes: "Sum to infinity S_∞ converges if and only if |r| < 1.",
  },
  {
    name: "Binomial Series Expansion (A-Level)",
    category: "sequences",
    level: "A-Level",
    formula: "(1 + x)ⁿ = 1 + n x + [n(n-1)/2!] x² + [n(n-1)(n-2)/3!] x³ + ...",
    formatted: (
      <span className="inline-flex items-center flex-wrap gap-x-1.5 gap-y-1">
        <span>(1 + x)ⁿ = 1 + n x +</span>
        <Fraction num="n(n - 1)" den="2!" />
        <span>x² +</span>
        <Fraction num="n(n - 1)(n - 2)" den="3!" />
        <span>x³ + ...</span>
      </span>
    ),
    notes: "Valid for any rational n, provided |x| < 1. For (a + bx)ⁿ, factor out aⁿ first.",
  },
];

const EXAM_BOARD_DOCS: ExamBoardDoc[] = [
  {
    name: "Edexcel GCSE (9-1) Mathematics: Higher Tier Exam Aid",
    examBoard: "Edexcel",
    level: "GCSE",
    description: "Official Pearson Edexcel GCSE (9-1) Mathematics (1MA1) Higher Tier Formulae & Exam Aid.",
    url: "https://qualifications.pearson.com/content/dam/pdf/GCSE/mathematics/2015/teaching-and-learning-materials/gcse-mathematics-1ma1-exam-aid-1h2h3h-june2025.pdf",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  {
    name: "AQA GCSE Mathematics (Higher): Formulae Sheet",
    examBoard: "AQA",
    level: "GCSE",
    description: "Official AQA (8300H) Higher Tier Formulae Sheet insert for examinations.",
    url: "https://filestore.aqa.org.uk/resources/mathematics/AQA-8300H-FS-INS-2024.PDF",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  {
    name: "Pearson Edexcel A Level GCE in Mathematics Formulae Book",
    examBoard: "Edexcel",
    level: "A-Level",
    description: "Official Pearson Edexcel A-Level Mathematics & Further Mathematics Formulae Book (MF1).",
    url: "https://qualifications.pearson.com/content/dam/pdf/A%20Level/Mathematics/2017/specification-and-sample-assesment/pearson-edexcel-a-level-gce-in-mathematics-formulae-book.pdf",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  {
    name: "AQA Data Booklet: Formulae (Maths)",
    examBoard: "AQA",
    level: "A-Level",
    description: "Official AQA AS & A-Level Mathematics formulae booklet and statistical tables.",
    url: "https://filestore.aqa.org.uk/resources/mathematics/AQA-AS-A-MATHS-FORMULAE.PDF",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  {
    name: "OCR A-Level Maths Formulae Booklet",
    examBoard: "OCR",
    level: "A-Level",
    description: "Official OCR AS & A-Level Mathematics formulae booklet and statistical tables.",
    url: "https://files.revisely.com/documents/alevel/other/ocr-maths-formulae-booklet.pdf",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
  },
];

interface FormulaSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FormulaSheetModal({ isOpen, onClose }: FormulaSheetModalProps) {
  // Primary Quick Access View: All Formulas vs GCSE Core vs A-Level Core vs Official Exam Booklets
  const [quickAccessView, setQuickAccessView] = useState<"formulas" | "gcse" | "alevel" | "exam_boards">("formulas");
  const [activeCategory, setActiveCategory] = useState<"all" | "algebra" | "trig" | "calculus" | "stats" | "mechanics" | "sequences">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "GCSE" | "A-Level">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  // Filter formulas based on primary quick view, category, level, and search term
  const filteredFormulas = FORMULAS.filter((f) => {
    // Quick access view override
    if (quickAccessView === "gcse" && f.level !== "GCSE" && f.level !== "Both") return false;
    if (quickAccessView === "alevel" && f.level !== "A-Level" && f.level !== "Both") return false;

    // Standard level filter (when in general formula bank)
    if (quickAccessView === "formulas" && levelFilter !== "all") {
      if (levelFilter === "GCSE" && f.level !== "GCSE" && f.level !== "Both") return false;
      if (levelFilter === "A-Level" && f.level !== "A-Level" && f.level !== "Both") return false;
    }

    const matchesCategory = activeCategory === "all" || f.category === activeCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.formula.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.notes && f.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  const handleCopy = (formula: string, index: number) => {
    navigator.clipboard.writeText(formula);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSelectQuickTab = (view: "formulas" | "gcse" | "alevel" | "exam_boards") => {
    setQuickAccessView(view);
    if (view === "gcse") {
      setLevelFilter("GCSE");
      setActiveCategory("all");
    } else if (view === "alevel") {
      setLevelFilter("A-Level");
      setActiveCategory("all");
    } else if (view === "formulas") {
      setLevelFilter("all");
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-sheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-[#131d31] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center font-black">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 id="formula-sheet-title" className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Maths Formula Sheet</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#48A5EE]/10 text-[#48A5EE] font-bold">
                  GCSE &amp; A-Level
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Key formulas, rules, identities &amp; official exam board specifications for online lessons.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close formula sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PRIMARY QUICK ACCESS TABS BAR */}
        <div className="px-4 pt-3 pb-2.5 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleSelectQuickTab("formulas")}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  quickAccessView === "formulas"
                    ? "bg-[#48A5EE] text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Formulas</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickTab("gcse")}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  quickAccessView === "gcse"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/70"
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>GCSE Core</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickTab("alevel")}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  quickAccessView === "alevel"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200/70 dark:border-purple-800/70"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>A-Level Core</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickTab("exam_boards")}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                  quickAccessView === "exam_boards"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/70"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Official Exam Sheets</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECONDARY FILTER CONTROLS (Only when not in exam boards view) */}
        {quickAccessView !== "exam_boards" && (
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131d31] space-y-2.5">
            {/* Search bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search formulas by name, equation, or keyword (e.g. suvat, quadratic, chain rule, circle)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#48A5EE]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Topic Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: "all", label: "All Topics" },
                { id: "algebra", label: "Algebra" },
                { id: "trig", label: "Trigonometry" },
                { id: "calculus", label: "Calculus" },
                { id: "stats", label: "Statistics" },
                { id: "mechanics", label: "Mechanics" },
                { id: "sequences", label: "Sequences" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#48A5EE] text-white shadow-xs"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CONTENT AREA */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 max-h-[60vh]">
          {quickAccessView === "exam_boards" ? (
            /* OFFICIAL EXAM BOARD SPECIFICATION SHEETS VIEW */
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Official formula sheets and statistical tables provided in UK GCSE and A-Level examinations. Click any card below to open the official documentation directly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {EXAM_BOARD_DOCS.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 hover:border-[#48A5EE]/60 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${doc.badgeColor}`}>
                          {doc.examBoard} • {doc.level}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 group-hover:text-[#48A5EE] transition-colors">
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {doc.description}
                      </p>
                    </div>

                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-[#48A5EE] hover:text-white dark:hover:bg-[#48A5EE] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all shadow-xs"
                    >
                      <span>Open PDF Formula Sheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* FORMULAS GRID VIEW */
            <>
              {filteredFormulas.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No formulas match your filters. Try selecting &quot;All Topics&quot; or clearing your search.
                </div>
              ) : (
                filteredFormulas.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5 hover:border-[#48A5EE]/50 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                          {item.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            item.level === "GCSE"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                              : item.level === "A-Level"
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300"
                              : "bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          {item.level}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(item.formula, index)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-[#48A5EE] px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Copy formula text"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Mathematical Formula Display with proper stacked fractions */}
                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm font-bold text-[#48A5EE] dark:text-[#60b5f5] tracking-wide select-all overflow-x-auto leading-loose flex items-center flex-wrap gap-y-2">
                      {item.formatted || item.formula}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                        💡 {item.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>LB Maths Tuition Quick Revision Reference</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
