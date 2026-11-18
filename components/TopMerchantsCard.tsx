import React from "react";
import { formatDollars, type MonthSpend } from "../chart-data";
import { Card } from "./ui/card";
import { HStack } from "./ui/hstack";
import { Text } from "./ui/text";
import { VStack } from "./ui/vstack";

type TopMerchantsCardProps = {
  month: MonthSpend | undefined;
};

export function TopMerchantsCard({ month }: TopMerchantsCardProps) {
  return (
    <Card className="bg-white border border-outline-100 rounded-xl p-4 shadow-sm">
      <VStack space="sm">
        <VStack space="xs">
          <Text className="text-base font-bold text-typography-900">
            Top merchants
          </Text>
          <Text className="text-sm text-typography-500 font-medium">
            {month ? month.label : "No month selected"}
          </Text>
        </VStack>
        {!month || month.topMerchants.length === 0 ? (
          <Text className="text-sm text-typography-500 py-2">
            No merchant spending was found for this month.
          </Text>
        ) : (
          <VStack>
            {month.topMerchants.map((row, index) => (
              <HStack
                key={`${row.name}-${index}`}
                className="items-baseline justify-between gap-3 py-2.5 border-t border-outline-100"
                style={index === 0 ? { borderTopWidth: 0 } : undefined}
              >
                <Text className="text-sm text-typography-900 flex-1">
                  {row.name}
                </Text>
                <Text className="text-sm font-bold text-typography-900">
                  {formatDollars(row.cents)}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>
    </Card>
  );
}
