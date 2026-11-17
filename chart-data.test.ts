import assert from "node:assert/strict";
import { test } from "node:test";
import {
  biggestPurchaseAnswer,
  eatingOutAnswer,
  formatDollars,
  parseMonths,
  previousMonthKey,
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
