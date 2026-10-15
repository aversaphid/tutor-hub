import { CasioCalculatorSession } from "../lib/casio-calculator-controller";
import { toSurd, formatSurdResult, toFraction } from "../lib/casio-math-engine";

console.log("=== Testing Casio fx-83GTX Surd & Radical Simplification Engine ===");

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`✅ [PASS] ${msg}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    failCount++;
  }
}

// 1. Test math engine directly
const surd32 = toSurd(Math.sqrt(32));
assert(
  surd32 !== null && surd32.coeff === 4 && surd32.radicand === 2 && surd32.den === 1,
  `toSurd(√32) yields coeff=4, radicand=2 (4√2)`
);
assert(formatSurdResult(surd32!) === "4√2", `formatSurdResult for √32 is '4√2'`);

const surd221 = toSurd(Math.sqrt(10 * 10 + 11 * 11));
assert(
  surd221 !== null && surd221.coeff === 1 && surd221.radicand === 221 && surd221.den === 1,
  `toSurd(√(10² + 11²)) yields coeff=1, radicand=221 (√221)`
);
assert(formatSurdResult(surd221!) === "√221", `formatSurdResult for √(10² + 11²) is '√221'`);

const surd8 = toSurd(Math.sqrt(8));
assert(
  surd8 !== null && surd8.coeff === 2 && surd8.radicand === 2 && surd8.den === 1,
  `toSurd(√8) yields coeff=2, radicand=2 (2√2)`
);

const surd25 = toSurd(Math.sqrt(25));
assert(surd25 === null, `toSurd(√25) yields null because 5 is an integer`);

const surdFrac = toSurd(1 / 3);
assert(surdFrac === null, `toSurd(1/3) yields null because 1/3 is a rational fraction`);

// 2. Test interactive calculator session with SQRT 32 =
const s1 = new CasioCalculatorSession();
s1.press("SQRT").press("3").press("2").press("=");
assert(s1.displayMode === "surd", `√32 sets displayMode to 'surd'`);
assert(s1.result === "4√2", `√32 result text is '4√2'`);
assert(s1.getDisplayResult() === "4√2", `√32 getDisplayResult is '4√2'`);

// Press S_TO_D -> converts to decimal
s1.press("S_TO_D");
assert(s1.displayMode === "decimal", `Pressing S<=>D on √32 changes displayMode to 'decimal'`);
assert(
  Math.abs(Number(s1.result) - Math.sqrt(32)) < 1e-9,
  `Decimal result ${s1.result} matches Math.sqrt(32)`
);

// Press S_TO_D again -> toggles back to surd
s1.press("S_TO_D");
assert(s1.displayMode === "surd", `Pressing S<=>D again toggles displayMode back to 'surd'`);
assert(s1.result === "4√2", `Result is restored to '4√2'`);

// 3. Test interactive calculator session with √(10² + 11²) =
const s2 = new CasioCalculatorSession();
s2.press("SQRT")
  .press("1")
  .press("0")
  .press("SQUARE")
  .press("+")
  .press("1")
  .press("1")
  .press("SQUARE")
  .press("=");

assert(s2.displayMode === "surd", `√(10² + 11²) sets displayMode to 'surd'`);
assert(s2.result === "√221", `√(10² + 11²) result text is '√221'`);
assert(s2.getDisplayResult() === "√221", `√(10² + 11²) getDisplayResult is '√221'`);

// Press S_TO_D -> converts to decimal
s2.press("S_TO_D");
assert(s2.displayMode === "decimal", `Pressing S<=>D on √221 changes displayMode to 'decimal'`);
assert(
  Math.abs(Number(s2.result) - Math.sqrt(221)) < 1e-7,
  `Decimal result ${s2.result} matches Math.sqrt(221)`
);

// Press S_TO_D again -> toggles back to surd
s2.press("S_TO_D");
assert(s2.displayMode === "surd", `Pressing S<=>D again toggles displayMode back to 'surd'`);
assert(s2.result === "√221", `Result is restored to '√221'`);

// 4. Test rational division does NOT become surd
const s3 = new CasioCalculatorSession();
s3.press("1").press("÷").press("3").press("=");
assert(s3.displayMode === "fraction", `1 ÷ 3 sets displayMode to 'fraction'`);
assert(s3.getDisplayResult() === "1/3", `1 ÷ 3 displays '1/3'`);

// 5. Test square root of fraction: √(2) ÷ 2 = √2/2
const s4 = new CasioCalculatorSession();
s4.press("SQRT").press("2").nav("RIGHT").press("÷").press("2").press("=");
assert(s4.displayMode === "surd", `√2 ÷ 2 sets displayMode to 'surd'`);
assert(s4.result === "√2/2", `√2 ÷ 2 result text is '√2/2'`);

console.log(`\n=================================================`);
console.log(`TOTAL SURD TESTS: ${passCount + failCount}`);
console.log(`PASSED:           ${passCount}`);
console.log(`FAILED:           ${failCount}`);
console.log(`SUCCESS RATE:     ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
console.log(`=================================================`);

if (failCount > 0) process.exit(1);
