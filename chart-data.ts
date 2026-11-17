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

export function previousMonthKey(month: string): string {
  const year = Number(month.slice(0, 4));
  const number = Number(month.slice(5, 7));
  if (number === 1) return `${year - 1}-12`;
  return `${year}-${String(number - 1).padStart(2, "0")}`;
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
  const prior = months.find((row) => row.month === previousMonthKey(month));
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
