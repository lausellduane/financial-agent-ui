import React, { useState } from "react";
import { Platform, Pressable, type Role } from "react-native";
import {
  categoryDeltaCents,
  formatDollars,
  formatSignedDollars,
  priorMonth,
  type MonthSpend,
} from "../chart-data";
import { Box } from "./ui/box";
import { Button, ButtonText } from "./ui/button";
import { Card } from "./ui/card";
import { HStack } from "./ui/hstack";
import { Spinner } from "./ui/spinner";
import { Text } from "./ui/text";
import { VStack } from "./ui/vstack";

export type ChartState = "empty" | "loading" | "error" | "ready";

function webAria(label: string, role: Role) {
  if (Platform.OS !== "web") return undefined;
  return { role, "aria-label": label };
}


type SpendingChartProps = {
  state: ChartState;
  months: MonthSpend[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
  onRetry?: () => void;
  showDeltas?: boolean;
};

export function SpendingChart({
  state,
  months,
  selectedMonth,
  onSelectMonth,
  onRetry,
  showDeltas = true,
}: SpendingChartProps) {
  const [collapsed, setCollapsed] = useState(false);
  const current =
    months.find((month) => month.month === selectedMonth) ??
    months[months.length - 1];
  const index = current
    ? months.findIndex((month) => month.month === current.month)
    : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < months.length - 1;
  const maxBar = current
    ? Math.max(0, ...current.categories.map((row) => Math.abs(row.cents)))
    : 0;
  const prior = current ? priorMonth(months, current.month) : undefined;

  return (
    <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm">
      <VStack space="md">
        <HStack className="items-start justify-between gap-2">
          <VStack className="flex-1 min-w-0">
            <Text className="text-base font-bold text-typography-900">
              Spending overview
            </Text>
            <Text className="text-sm text-typography-500 font-medium">
              {state === "loading"
                ? "Loading spending…"
                : state === "error"
                  ? "Chart unavailable"
                  : current
                    ? `${current.label} · ${formatDollars(current.totalCents)} spent`
                    : "No spending to chart yet"}
            </Text>
          </VStack>
          {state === "ready" && current ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                collapsed ? "Expand spending chart" : "Collapse spending chart"
              }
              accessibilityState={{ expanded: !collapsed }}
              onPress={() => setCollapsed((value) => !value)}
              className="h-11 px-3 items-center justify-center rounded-lg"
            >
              <Text className="text-sm font-semibold text-typography-700">
                {collapsed ? "Show" : "Hide"}
              </Text>
            </Pressable>
          ) : null}
        </HStack>

        {state === "loading" ? (
          <Box className="items-center py-6">
            <Spinner size="small" />
          </Box>
        ) : null}

        {state === "error" ? (
          <VStack space="sm" className="items-center py-4">
            <Text className="text-sm text-typography-500 text-center">
              Spending chart is unavailable. Try again to load your ledger.
            </Text>
            {onRetry ? (
              <Button
                size="sm"
                variant="default"
                onPress={onRetry}
                className="rounded-xl bg-blue-500 hover:bg-primary-700 text-white"
              >
                <ButtonText className="font-semibold">Retry</ButtonText>
              </Button>
            ) : null}
          </VStack>
        ) : null}

        {state === "empty" ? (
          <Text className="text-sm text-typography-500 text-center py-4">
            Upload a statement to see monthly spending by category.
          </Text>
        ) : null}

        {state === "ready" && !collapsed ? (
          <VStack space="md">
            {current ? (
              <HStack className="items-center justify-center gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  disabled={!canPrev}
                  onPress={() => {
                    if (canPrev) onSelectMonth(months[index - 1]!.month);
                  }}
                  className={`h-11 w-11 items-center justify-center rounded-lg border border-outline-200 ${
                    canPrev ? "" : "opacity-40"
                  }`}
                >
                  <Text className="text-lg font-semibold text-typography-900">
                    ‹
                  </Text>
                </Pressable>
                <Text className="min-w-[5.5rem] text-center text-sm font-semibold text-typography-900">
                  {current.label}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  disabled={!canNext}
                  onPress={() => {
                    if (canNext) onSelectMonth(months[index + 1]!.month);
                  }}
                  className={`h-11 w-11 items-center justify-center rounded-lg border border-outline-200 ${
                    canNext ? "" : "opacity-40"
                  }`}
                >
                  <Text className="text-lg font-semibold text-typography-900">
                    ›
                  </Text>
                </Pressable>
              </HStack>
            ) : null}

            {current && current.categories.length > 0 ? (
              <VStack space="sm">
                {current.categories.map((row) => {
                  const width =
                    maxBar > 0
                      ? Math.max(0, Math.round((Math.abs(row.cents) / maxBar) * 100))
                      : 0;
                  const delta = showDeltas
                    ? categoryDeltaCents(current, prior, row.name)
                    : null;
                  const deltaLabel =
                    delta === null
                      ? ""
                      : delta === 0
                        ? `, no change vs ${prior?.label}`
                        : `, ${delta > 0 ? "up" : "down"} ${formatDollars(Math.abs(delta))} vs ${prior?.label}`;
                  const barLabel = `${row.name} ${formatDollars(row.cents)}${deltaLabel}`;
                  return (
                    <VStack
                      key={row.name}
                      space="xs"
                      accessible
                      accessibilityRole="text"
                      accessibilityLabel={barLabel}
                      {...webAria(barLabel, "img")}
                    >
                      <HStack className="items-baseline justify-between gap-2">
                        <Text className="text-sm font-medium text-typography-900 flex-1">
                          {row.name}
                        </Text>
                        <HStack className="items-baseline gap-2">
                          <Text className="text-sm font-bold text-typography-900">
                            {formatDollars(row.cents)}
                          </Text>
                          {delta !== null ? (
                            <Text className="text-xs font-semibold text-typography-500">
                              {formatSignedDollars(delta)}
                            </Text>
                          ) : null}
                        </HStack>
                      </HStack>
                      <Box className="h-3 rounded-full bg-background-200 overflow-hidden">
                        <Box
                          className="h-3 rounded-full bg-blue-500"
                          style={{ width: `${width}%` }}
                        />
                      </Box>
                    </VStack>
                  );
                })}
              </VStack>
            ) : (
              <Text className="text-sm text-typography-500 text-center py-2">
                No categorized spending to chart for this period.
              </Text>
            )}

            <Text className="text-xs text-typography-400">
              Money-out only. Income, transfers, and credit-card payments are
              excluded. Refunds reduce net spending. Other includes
              uncategorized merchants.
            </Text>
          </VStack>
        ) : null}
      </VStack>
    </Card>
  );
}
