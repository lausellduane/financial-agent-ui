export type CategorySpend = {
  name: string;
  cents: number;
};

export type MerchantSpend = {
  name: string;
  cents: number;
};

export type MonthSpend = {
  month: string;
  label: string;
  totalCents: number;
  categories: CategorySpend[];
  topMerchants: MerchantSpend[];
  biggestPurchase: MerchantSpend | null;
  diningCents: number;
  placeholder?: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && Number.isInteger(value)) {
    return value;
  }
  return undefined;
}

function asText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function readNamedCents(value: unknown): MerchantSpend | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const name = asText(record.name);
  const cents = asInt(record.cents);
  if (!name || cents === undefined) return undefined;
  return { name, cents };
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function previousMonthKey(month: string): string {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (number === 1) return `${year - 1}-12`;
  return `${year}-${String(number - 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const year = month.slice(0, 4);
  const index = Number(month.slice(5, 7)) - 1;
  const name = MONTH_NAMES[index];
  return name ? `${name} ${year}` : month;
}

function emptyMonth(month: string): MonthSpend {
  return {
    month,
    label: monthLabel(month),
    totalCents: 0,
    diningCents: 0,
    categories: [],
    topMerchants: [],
    biggestPurchase: null,
    placeholder: true,
  };
}

export function parseMonths(body: unknown): MonthSpend[] {
  const record = asRecord(body);
  if (!record || !Array.isArray(record.months)) return [];
  const months: MonthSpend[] = [];
  for (const item of record.months) {
    const row = asRecord(item);
    if (!row) continue;
    const month = asText(row.month);
    const label = asText(row.label);
    const totalCents = asInt(row.totalCents);
    const diningCents = asInt(row.diningCents);
    if (
      !month ||
      !/^\d{4}-\d{2}$/.test(month) ||
      !label ||
      totalCents === undefined ||
      diningCents === undefined
    ) {
      continue;
    }
    const categories = Array.isArray(row.categories)
      ? row.categories
          .map(readNamedCents)
          .filter((entry): entry is CategorySpend => entry !== undefined)
      : [];
    const topMerchants = Array.isArray(row.topMerchants)
      ? row.topMerchants
          .map(readNamedCents)
          .filter((entry): entry is MerchantSpend => entry !== undefined)
      : [];
    let biggestPurchase: MerchantSpend | null = null;
    if (row.biggestPurchase !== null && row.biggestPurchase !== undefined) {
      biggestPurchase = readNamedCents(row.biggestPurchase) ?? null;
    }
    months.push({
      month,
      label,
      totalCents,
      categories,
      topMerchants,
      biggestPurchase,
      diningCents,
    });
  }
  return months;
}

export function formatDollars(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${String(rem).padStart(2, "0")}`;
}

export function topMerchantsAnswer(month: MonthSpend): string {
  if (!month.topMerchants.length) {
    return `No merchant spending was found in ${month.label}.`;
  }
  const list = month.topMerchants
    .map((row, index) => `${index + 1}. ${row.name} ${formatDollars(row.cents)}`)
    .join(", ");
  return `Top merchants in ${month.label}: ${list}.`;
}

export function eatingOutAnswer(months: MonthSpend[], month: string): string {
  const current = months.find((row) => row.month === month);
  if (!current) return "No spending data is loaded for that month.";
  const prior = priorMonth(months, month);
  const currentAmount = formatDollars(current.diningCents);
  if (!prior) {
    return `Eating out: ${currentAmount} in ${current.label}. No prior-month data to compare.`;
  }
  const delta = current.diningCents - prior.diningCents;
  if (delta === 0) {
    return `Eating out: ${currentAmount} in ${current.label} — unchanged vs ${prior.label} (${formatDollars(prior.diningCents)}).`;
  }
  const dir = delta > 0 ? "up" : "down";
  const percent =
    prior.diningCents !== 0
      ? `, ${Math.round((Math.abs(delta) / Math.abs(prior.diningCents)) * 100)}%`
      : "";
  return `Eating out: ${currentAmount} in ${current.label} vs ${formatDollars(prior.diningCents)} in ${prior.label} (${dir} ${formatDollars(Math.abs(delta))}${percent}).`;
}

export function totalSpentAnswer(month: MonthSpend): string {
  return `Total spent in ${month.label}: ${formatDollars(month.totalCents)} (net spending, money-out only; income, transfers, and credit-card payments are excluded).`;
}

export function biggestPurchaseAnswer(month: MonthSpend): string {
  if (!month.biggestPurchase) {
    return `No purchases were found in ${month.label}.`;
  }
  return `Biggest purchase in ${month.label}: ${month.biggestPurchase.name} ${formatDollars(month.biggestPurchase.cents)}.`;
}

export function formatSignedDollars(cents: number): string {
  if (cents === 0) return "±$0.00";
  const sign = cents > 0 ? "+" : "−";
  return `${sign}${formatDollars(Math.abs(cents))}`;
}

export type MonthChange = {
  deltaCents: number;
  percent: number | null;
  headline: string;
  detail: string;
};

export function monthChange(
  current: MonthSpend,
  prior: MonthSpend | undefined,
): MonthChange {
  if (!prior) {
    return {
      deltaCents: 0,
      percent: null,
      headline: "—",
      detail: "No earlier month in this report",
    };
  }
  const deltaCents = current.totalCents - prior.totalCents;
  const percent =
    prior.totalCents !== 0
      ? Math.round((deltaCents / prior.totalCents) * 1000) / 10
      : null;
  const pctText =
    percent === null ? "" : ` (${percent > 0 ? "+" : ""}${percent.toFixed(1)}%)`;
  const word =
    deltaCents > 0 ? "more than" : deltaCents < 0 ? "less than" : "same as";
  return {
    deltaCents,
    percent,
    headline: `${formatSignedDollars(deltaCents)}${pctText}`,
    detail: `${word} ${prior.label} (${formatDollars(prior.totalCents)})`,
  };
}

export type TopCategory = {
  name: string;
  cents: number;
  share: number;
};

export function topCategory(month: MonthSpend): TopCategory | null {
  const rows = month.categories.filter((row) => row.name !== "Other");
  if (!rows.length) return null;
  const top = rows.reduce((best, row) => (row.cents > best.cents ? row : best));
  const share =
    month.totalCents !== 0
      ? Math.round((top.cents / month.totalCents) * 1000) / 10
      : 0;
  return { name: top.name, cents: top.cents, share };
}

export function categoryDeltaCents(
  current: MonthSpend,
  prior: MonthSpend | undefined,
  name: string,
): number | null {
  if (!prior) return null;
  const currentCents =
    current.categories.find((row) => row.name === name)?.cents ?? 0;
  const priorCents = prior.categories.find((row) => row.name === name)?.cents ?? 0;
  return currentCents - priorCents;
}

export function lastThreeMonths(
  months: MonthSpend[],
  selectedMonth: string | null,
): MonthSpend[] {
  if (!months.length) return [];
  const endKey =
    selectedMonth && months.some((row) => row.month === selectedMonth)
      ? selectedMonth
      : months[months.length - 1]!.month;
  const keys = [
    previousMonthKey(previousMonthKey(endKey)),
    previousMonthKey(endKey),
    endKey,
  ];
  const byKey = new Map(months.map((row) => [row.month, row]));
  return keys.map((key) => byKey.get(key) ?? emptyMonth(key));
}

export function priorMonth(
  months: MonthSpend[],
  selectedMonth: string | null,
): MonthSpend | undefined {
  if (!selectedMonth || !months.length) return undefined;
  const key = previousMonthKey(selectedMonth);
  const found = months.find((row) => row.month === key);
  if (found) return found;
  const earliest = months.reduce((a, b) => (a.month < b.month ? a : b)).month;
  // A missing calendar month after the first report month is a $0 gap, the
  // same kind of placeholder the three-month trend shows.
  if (key > earliest) return emptyMonth(key);
  return undefined;
}
