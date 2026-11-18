import React from "react";
import {
  formatDollars,
  monthChange,
  priorMonth,
  topCategory,
  type MonthSpend,
} from "../chart-data";
import type { ChartState } from "./SpendingChart";
import { Box } from "./ui/box";
import { Text } from "./ui/text";
import { VStack } from "./ui/vstack";

type SummaryTilesProps = {
  state: ChartState;
  months: MonthSpend[];
  selectedMonth: string | null;
  columns: 2 | 4;
};

type TileData = { label: string; value: string; detail: string };

function tilesFor(
  state: ChartState,
  months: MonthSpend[],
  selectedMonth: string | null,
): TileData[] {
  const labels = [
    "Total spent",
    "Change vs last month",
    "Top category",
    "Biggest purchase",
  ];
  if (state === "loading") {
    return labels.map((label) => ({ label, value: "…", detail: "Loading…" }));
  }
  if (state !== "ready") {
    const detail =
      state === "empty" ? "Upload a CSV to see this" : "Unavailable right now";
    return labels.map((label) => ({ label, value: "—", detail }));
  }
  const current =
    months.find((month) => month.month === selectedMonth) ??
    months[months.length - 1];
  if (!current) {
    return labels.map((label) => ({
      label,
      value: "—",
      detail: "No spending to summarize yet",
    }));
  }
  const change = monthChange(current, priorMonth(months, current.month));
  const top = topCategory(current);
  const biggest = current.biggestPurchase;
  return [
    {
      label: "Total spent",
      value: formatDollars(current.totalCents),
      detail: `${current.label} · money out only`,
    },
    {
      label: "Change vs last month",
      value: change.headline,
      detail: change.detail,
    },
    {
      label: "Top category",
      value: top ? top.name : "—",
      detail: top
        ? `${formatDollars(top.cents)} · ${top.share.toFixed(1)}% of spending`
        : "No category to highlight",
    },
    {
      label: "Biggest purchase",
      value: biggest ? formatDollars(biggest.cents) : "—",
      detail: biggest ? `${biggest.name} · single charge` : "No purchases in this month",
    },
  ];
}

export function SummaryTiles({
  state,
  months,
  selectedMonth,
  columns,
}: SummaryTilesProps) {
  const tiles = tilesFor(state, months, selectedMonth);
  return (
    <Box
      accessibilityRole="summary"
      accessibilityLabel="Month summary"
      className="flex-row flex-wrap"
      style={{ gap: 12 }}
    >
      {tiles.map((tile) => (
        <VStack
          key={tile.label}
          space="xs"
          className="bg-white border border-outline-100 rounded-xl p-3.5 shadow-sm"
          style={{
            flexGrow: 1,
            flexBasis: columns === 4 ? "22%" : "46%",
            minWidth: columns === 4 ? 140 : 140,
          }}
        >
          <Text className="text-xs font-semibold text-typography-500">
            {tile.label}
          </Text>
          <Text className="text-xl font-extrabold text-typography-900">
            {tile.value}
          </Text>
          <Text className="text-xs text-typography-500">{tile.detail}</Text>
        </VStack>
      ))}
    </Box>
  );
}
