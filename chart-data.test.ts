import assert from "node:assert/strict";
import { test } from "node:test";
import {
  biggestPurchaseAnswer,
  categoryDeltaCents,
  eatingOutAnswer,
  formatDollars,
  formatSignedDollars,
  lastThreeMonths,
  monthChange,
  parseMonths,
  previousMonthKey,
  priorMonth,
  topCategory,
  topMerchantsAnswer,
  totalSpentAnswer,
  type MonthSpend,
} from "./chart-data.ts";

const november: MonthSpend = {
  month: "2026-11",
  label: "Nov 2026",
  totalCents: 208600,
  diningCents: 31800,
  categories: [
    { name: "Groceries", cents: 61200 },
    { name: "Eating out", cents: 31800 },
  ],
  topMerchants: [
    { name: "Sample Market", cents: 28410 },
    { name: "Demo Cafe", cents: 9640 },
  ],
  biggestPurchase: { name: "Sample Market", cents: 14250 },
};

const october: MonthSpend = {
  month: "2026-10",
  label: "Oct 2026",
  totalCents: 198600,
  diningCents: 26100,
  categories: [{ name: "Eating out", cents: 26100 }],
  topMerchants: [{ name: "Sample Market", cents: 26000 }],
  biggestPurchase: { name: "Example Energy", cents: 19000 },
};

test("formats dollar amounts", () => {
  assert.equal(formatDollars(0), "$0.00");
  assert.equal(formatDollars(208600), "$2,086.00");
  assert.equal(formatDollars(-1200), "-$12.00");
});

test("parses valid months and skips bad rows", () => {
  assert.deepEqual(parseMonths(null), []);
  assert.deepEqual(parseMonths({ loaded: true }), []);
  const months = parseMonths({
    loaded: true,
    months: [
      november,
      { month: "bad", label: "Nope", totalCents: 1, diningCents: 0 },
      "skip",
    ],
  });
  assert.deepEqual(months, [november]);
});

test("quick-question answers use the selected month and prior calendar month", () => {
  assert.equal(previousMonthKey("2026-01"), "2025-12");
  assert.equal(
    topMerchantsAnswer(november),
    "Top merchants in Nov 2026: 1. Sample Market $284.10, 2. Demo Cafe $96.40.",
  );
  assert.equal(
    eatingOutAnswer([october, november], "2026-11"),
    "Eating out: $318.00 in Nov 2026 vs $261.00 in Oct 2026 (up $57.00, 22%).",
  );
  assert.equal(
    eatingOutAnswer([november], "2026-11"),
    "Eating out: $318.00 in Nov 2026. No prior-month data to compare.",
  );
  assert.equal(
    eatingOutAnswer([october, { ...november, diningCents: 26100 }], "2026-11"),
    "Eating out: $261.00 in Nov 2026 — unchanged vs Oct 2026 ($261.00).",
  );
  assert.equal(
    totalSpentAnswer(november),
    "Total spent in Nov 2026: $2,086.00 (net spending, money-out only; income, transfers, and credit-card payments are excluded).",
  );
  assert.equal(
    biggestPurchaseAnswer(november),
    "Biggest purchase in Nov 2026: Sample Market $142.50.",
  );
  assert.equal(
    biggestPurchaseAnswer({ ...november, biggestPurchase: null }),
    "No purchases were found in Nov 2026.",
  );
});

const september: MonthSpend = {
  month: "2026-09",
  label: "Sep 2026",
  totalCents: 188400,
  diningCents: 26100,
  categories: [
    { name: "Groceries", cents: 55000 },
    { name: "Eating out", cents: 26100 },
  ],
  topMerchants: [],
  biggestPurchase: { name: "Example Energy", cents: 18000 },
};

test("month change, top category, and last-three-month helpers", () => {
  assert.equal(formatSignedDollars(10000), "+$100.00");
  assert.equal(formatSignedDollars(-10200), "−$102.00");
  assert.equal(formatSignedDollars(0), "±$0.00");

  const change = monthChange(november, october);
  assert.equal(change.deltaCents, 10000);
  assert.equal(change.percent, 5.0);
  assert.equal(change.headline, "+$100.00 (+5.0%)");
  assert.equal(change.detail, "more than Oct 2026 ($1,986.00)");
  assert.equal(monthChange(november, undefined).detail, "No earlier month in this report");
  assert.equal(
    monthChange(november, { ...october, totalCents: 208600 }).headline,
    "±$0.00 (0.0%)",
  );

  const top = topCategory(november);
  assert.deepEqual(top, { name: "Groceries", cents: 61200, share: 29.3 });
  assert.equal(topCategory({ ...november, categories: [{ name: "Other", cents: 100 }] }), null);

  assert.equal(categoryDeltaCents(november, october, "Eating out"), 5700);
  assert.equal(categoryDeltaCents(november, undefined, "Eating out"), null);

  assert.deepEqual(
    lastThreeMonths([september, october, november], "2026-11").map((row) => row.month),
    ["2026-09", "2026-10", "2026-11"],
  );
  assert.deepEqual(
    lastThreeMonths([september, october, november], "2026-10").map((row) => ({
      month: row.month,
      totalCents: row.totalCents,
      placeholder: row.placeholder ?? false,
    })),
    [
      { month: "2026-08", totalCents: 0, placeholder: true },
      { month: "2026-09", totalCents: 188400, placeholder: false },
      { month: "2026-10", totalCents: 198600, placeholder: false },
    ],
  );
  assert.equal(priorMonth([september, october, november], "2026-11")?.month, "2026-10");
  assert.equal(priorMonth([september, october, november], "2026-11")?.placeholder, undefined);
  assert.equal(priorMonth([september, october, november], "2026-09"), undefined);
});

test("priorMonth treats a missing calendar month after the first report month as $0", () => {
  const prior = priorMonth([september, november], "2026-11");
  assert.equal(prior?.month, "2026-10");
  assert.equal(prior?.label, "Oct 2026");
  assert.equal(prior?.totalCents, 0);
  assert.equal(prior?.placeholder, true);
  const change = monthChange(november, prior);
  assert.equal(change.deltaCents, 208600);
  assert.equal(change.headline, "+$2,086.00");
  assert.equal(change.detail, "more than Oct 2026 ($0.00)");
  assert.equal(priorMonth([september, november], "2026-09"), undefined);
  assert.equal(priorMonth([november], "2026-11"), undefined);
});

test("lastThreeMonths inserts a $0 bar for a missing calendar month", () => {
  const rows = lastThreeMonths([september, november], "2026-11");
  assert.deepEqual(
    rows.map((row) => ({
      month: row.month,
      label: row.label,
      totalCents: row.totalCents,
      placeholder: row.placeholder ?? false,
    })),
    [
      { month: "2026-09", label: "Sep 2026", totalCents: 188400, placeholder: false },
      { month: "2026-10", label: "Oct 2026", totalCents: 0, placeholder: true },
      { month: "2026-11", label: "Nov 2026", totalCents: 208600, placeholder: false },
    ],
  );
  const january: MonthSpend = { ...september, month: "2026-01", label: "Jan 2026" };
  assert.deepEqual(
    lastThreeMonths([january], "2026-01").map((row) => row.month),
    ["2025-11", "2025-12", "2026-01"],
  );
  assert.equal(lastThreeMonths([january], "2026-01")[0]?.placeholder, true);
  assert.deepEqual(lastThreeMonths([], "2026-11"), []);
});
