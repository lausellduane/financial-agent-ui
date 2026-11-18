import React from "react";
import { Pressable } from "react-native";
import { formatDollars, lastThreeMonths, type MonthSpend } from "../chart-data";
import { Box } from "./ui/box";
import { Card } from "./ui/card";
import { HStack } from "./ui/hstack";
import { Text } from "./ui/text";
import { VStack } from "./ui/vstack";

type MonthTrendProps = {
  months: MonthSpend[];
  selectedMonth: string | null;
  onSelectMonth: (month: string) => void;
};

export function MonthTrend({
  months,
  selectedMonth,
  onSelectMonth,
}: MonthTrendProps) {
  const shown = lastThreeMonths(months, selectedMonth);
  const max = Math.max(0, ...shown.map((month) => Math.abs(month.totalCents)));

  return (
    <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm">
      <VStack space="sm">
        <VStack space="xs">
          <Text className="text-base font-bold text-typography-900">
            Last 3 months
          </Text>
          <Text className="text-sm text-typography-500 font-medium">
            Total spent · tap a month to view it
          </Text>
        </VStack>
        {shown.length === 0 ? (
          <Text className="text-sm text-typography-500 py-4">
            No monthly totals to compare yet.
          </Text>
        ) : (
          <HStack className="items-end justify-between gap-2" style={{ height: 170 }}>
            {shown.map((month) => {
              const selected = month.month === selectedMonth;
              const height =
                max > 0
                  ? Math.max(8, Math.round((Math.abs(month.totalCents) / max) * 110))
                  : 8;
              return (
                <Pressable
                  key={month.month}
                  accessibilityRole="button"
                  accessibilityLabel={`${month.label} ${formatDollars(month.totalCents)}`}
                  accessibilityState={{ selected }}
                  onPress={() => onSelectMonth(month.month)}
                  className={`flex-1 min-h-11 items-center justify-end rounded-lg border px-1 py-2 ${
                    selected
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent"
                  }`}
                >
                  <Text className="text-xs font-bold text-typography-900 text-center mb-1">
                    {formatDollars(month.totalCents)}
                  </Text>
                  <Box
                    className="w-10 rounded-t-md"
                    style={{
                      height,
                      backgroundColor: selected ? "#3b82f6" : "#d4d4d4",
                    }}
                  />
                  <Text className="text-xs font-semibold text-typography-900 mt-1">
                    {month.label.split(" ")[0]}
                  </Text>
                </Pressable>
              );
            })}
          </HStack>
        )}
      </VStack>
    </Card>
  );
}
