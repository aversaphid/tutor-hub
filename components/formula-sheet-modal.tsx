"use client";

import React, { useState } from "react";
import { X, Search, Calculator, Check, Copy } from "lucide-react";

interface FormulaItem {
  name: string;
  category: "algebra" | "trig" | "calculus" | "stats";
  level: "GCSE" | "A-Level" | "Both";
  formula: string;
  notes?: string;
}

const FORMULAS: FormulaItem[] = [
  // Algebra & Quadratics
  {
    name: "Quadratic Formula",
    category: "algebra",
    level: "GCSE",
    formula: "x = (-b ± √(b² - 4ac)) / (2a)",
    notes: "For any equation in the form ax² + bx + c = 0. If b² - 4ac < 0, there are no real solutions.",
  },
  {
    name: "Difference of Two Squares",
    category: "algebra",
    level: "GCSE",
    formula: "a² - b² = (a - b)(a + b)",
    notes: "Essential for rapid factorising and algebraic fractions.",
  },
  {
    name: "Completing the Square",
    category: "algebra",
    level: "GCSE",
    formula: "x² + bx + c = (x + b/2)² - (b/2)² + c",
    notes: "Turning point of the parabola is at (-b/2, c - (b/2)²).",
  },
  {
    name: "Laws of Indices",
    category: "algebra",
    level: "GCSE",
    formula: "aᵐ × aⁿ = aᵐ⁺ⁿ  |  aᵐ ÷ aⁿ = aᵐ⁻ⁿ  |  (aᵐ)ⁿ = aᵐⁿ  |  a⁻ⁿ = 1/aⁿ  |  a^(m/n) = ⁿ√(aᵐ)",
    notes: "Also note that any non-zero number to power 0 is 1 (a⁰ = 1).",
  },
  {
    name: "Equation of a Straight Line",
    category: "algebra",
    level: "GCSE",
    formula: "y = mx + c   or   y - y₁ = m(x - x₁)",
    notes: "Gradient m = (y₂ - y₁) / (x₂ - x₁). Perpendicular line gradient = -1/m.",
  },

  // Trigonometry & Geometry
  {
    name: "Pythagoras' Theorem",
    category: "trig",
    level: "GCSE",
    formula: "a² + b² = c²",
    notes: "In right-angled triangles where c is the hypotenuse.",
  },
  {
    name: "Trigonometric Ratios (SOH CAH TOA)",
    category: "trig",
    level: "GCSE",
    formula: "sin(θ) = Opp/Hyp  |  cos(θ) = Adj/Hyp  |  tan(θ) = Opp/Adj",
    notes: "Remember tan(θ) = sin(θ) / cos(θ) and sin²(θ) + cos²(θ) = 1.",
  },
  {
    name: "The Sine Rule",
    category: "trig",
    level: "GCSE",
    formula: "a / sin(A) = b / sin(B) = c / sin(C)",
    notes: "Use for finding sides. Invert for angles: sin(A)/a = sin(B)/b. Beware ambiguous case for obtuse angles.",
  },
  {
    name: "The Cosine Rule",
    category: "trig",
    level: "GCSE",
    formula: "a² = b² + c² - 2bc cos(A)   =>   cos(A) = (b² + c² - a²) / (2bc)",
    notes: "Use when you have 3 sides (SSS) or 2 sides and the included angle (SAS).",
  },
  {
    name: "Area of Any Triangle",
    category: "trig",
    level: "GCSE",
    formula: "Area = ½ a b sin(C)",
    notes: "Where C is the included angle between sides a and b.",
  },
  {
    name: "Circles: Area & Circumference",
    category: "trig",
    level: "GCSE",
    formula: "Area = πr²   |   Circumference = 2πr = πd",
    notes: "Arc length = (θ/360) × 2πr. Sector area = (θ/360) × πr².",
  },
  {
    name: "Volume & Surface Area of Sphere & Cone",
    category: "trig",
    level: "GCSE",
    formula: "Sphere V = ⁴⁄₃πr³, SA = 4πr²  |  Cone V = ⅓πr²h, Curved SA = πrl",
    notes: "Where l is the slant height (l² = r² + h²).",
  },

  // Calculus (A-Level)
  {
    name: "Differentiation / Power Rule",
    category: "calculus",
    level: "Both",
    formula: "d/dx (xⁿ) = n xⁿ⁻¹   |   d/dx (c) = 0",
    notes: "Multiply by power, reduce power by 1. For integration: ∫ xⁿ dx = (xⁿ⁺¹)/(n+1) + C (for n ≠ -1).",
  },
  {
    name: "Exponential & Logarithmic Derivatives",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (eᵏˣ) = k eᵏˣ   |   d/dx (ln x) = 1/x   |   d/dx (aˣ) = aˣ ln(a)",
    notes: "Integral of 1/x is ln|x| + C.",
  },
  {
    name: "Trigonometric Derivatives",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (sin x) = cos x  |  d/dx (cos x) = -sin x  |  d/dx (tan x) = sec²(x)",
    notes: "Ensure angles are always in radians when applying calculus rules!",
  },
  {
    name: "Product Rule & Quotient Rule",
    category: "calculus",
    level: "A-Level",
    formula: "d/dx (uv) = u(dv/dx) + v(du/dx)   |   d/dx (u/v) = (v(du/dx) - u(dv/dx)) / v²",
    notes: "Quotient rule: (Lo d-Hi - Hi d-Lo) / (Lo)². Chain rule: dy/dx = (dy/du) × (du/dx).",
  },
  {
    name: "Integration by Parts",
    category: "calculus",
    level: "A-Level",
    formula: "∫ u (dv/dx) dx = u v - ∫ v (du/dx) dx",
    notes: "L.I.A.T.E. guide for picking u: Logarithms, Inverse trig, Algebraic, Trigonometric, Exponential.",
  },

  // Probability & Statistics
  {
    name: "Probability: Addition & Multiplication Rules",
    category: "stats",
    level: "Both",
    formula: "P(A ∪ B) = P(A) + P(B) - P(A ∩ B)   |   P(A ∩ B) = P(A) × P(B|A)",
    notes: "If mutually exclusive: P(A ∩ B) = 0. If independent: P(A ∩ B) = P(A) × P(B).",
  },
  {
    name: "Conditional Probability",
    category: "stats",
    level: "Both",
    formula: "P(A|B) = P(A ∩ B) / P(B)",
    notes: "Probability of event A occurring given that event B has already occurred.",
  },
  {
    name: "Binomial Distribution",
    category: "stats",
    level: "A-Level",
    formula: "P(X = r) = ⁿCᵣ × pʳ × (1 - p)ⁿ⁻ʳ",
    notes: "Mean = np, Variance = np(1-p). Requires fixed n trials, independent trials, 2 outcomes, constant p.",
  },
];

interface FormulaSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FormulaSheetModal({ isOpen, onClose }: FormulaSheetModalProps) {
  const [activeCategory, setActiveCategory] = useState<"all" | "algebra" | "trig" | "calculus" | "stats">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const filteredFormulas = FORMULAS.filter((f) => {
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-sheet-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#131d31] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#48A5EE]/10 text-[#48A5EE] flex items-center justify-center font-black">
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
                Key formulas, rules &amp; identities for your online tuition sessions.
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

        {/* Filter Controls & Search */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131d31] space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search formulas by name, symbol, or topic (e.g. cosine, quadratic, product rule)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#48A5EE]"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: "all", label: "All Formulas" },
              { id: "algebra", label: "Algebra & Quadratics" },
              { id: "trig", label: "Trigonometry & Shapes" },
              { id: "calculus", label: "A-Level Calculus" },
              { id: "stats", label: "Probability & Stats" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
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

        {/* Formulas Grid */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3.5 max-h-[60vh]">
          {filteredFormulas.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No formulas match &quot;{searchTerm}&quot;. Try searching for another topic.
            </div>
          ) : (
            filteredFormulas.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800/80 space-y-2 hover:border-[#48A5EE]/50 transition-all group"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                      {item.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
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
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mathematical Formula Display */}
                <div className="p-3 rounded-xl bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-slate-800 font-mono text-xs sm:text-sm font-bold text-[#48A5EE] dark:text-[#60b5f5] tracking-wide select-all overflow-x-auto">
                  {item.formula}
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                    💡 {item.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-400">
          <span>LB Maths Tuition Quick Revision Reference</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
