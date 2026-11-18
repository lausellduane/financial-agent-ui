import React from "react";
import { Pressable, ScrollView } from "react-native";
import {
  biggestPurchaseAnswer,
  eatingOutAnswer,
  topMerchantsAnswer,
  totalSpentAnswer,
  type MonthSpend,
} from "../chart-data";
import { Box } from "./ui/box";
import { Text } from "./ui/text";
import { VStack } from "./ui/vstack";

type QuickQuestionsProps = {
  months: MonthSpend[];
  selectedMonth: string | null;
  disabled?: boolean;
  horizontal?: boolean;
  onAnswer: (question: string, answer: string) => void;
};

const BUTTONS: { id: string; label: string }[] = [
  { id: "merchants", label: "Top merchants" },
  { id: "eating", label: "Eating out vs last month" },
  { id: "total", label: "Total spent" },
  { id: "biggest", label: "Biggest purchase" },
];

export function QuickQuestions({
  months,
  selectedMonth,
  disabled = false,
  horizontal = false,
  onAnswer,
}: QuickQuestionsProps) {
  const current =
    months.find((month) => month.month === selectedMonth) ??
    months[months.length - 1];
  if (!current) return null;

  function answerFor(id: string): string {
    if (!current) return "No spending data is loaded for that month.";
    if (id === "merchants") return topMerchantsAnswer(current);
    if (id === "eating") return eatingOutAnswer(months, current.month);
    if (id === "total") return totalSpentAnswer(current);
    return biggestPurchaseAnswer(current);
  }

  return (
    <VStack space="sm">
      <Text className="text-xs text-typography-500 font-medium">
        Quick questions for {current.label}
      </Text>
      {horizontal ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, alignItems: "center" }}
        >
          {BUTTONS.map((button) => (
            <Pressable
              key={button.id}
              accessibilityRole="button"
              accessibilityLabel={button.label}
              disabled={disabled}
              onPress={() => onAnswer(button.label, answerFor(button.id))}
              className={`min-h-11 px-3.5 py-2 rounded-full border border-outline-200 bg-blue-50 ${
                disabled ? "opacity-40" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-typography-900">
                {button.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <Box className="flex-row flex-wrap gap-2">
          {BUTTONS.map((button) => (
            <Pressable
              key={button.id}
              accessibilityRole="button"
              accessibilityLabel={button.label}
              disabled={disabled}
              onPress={() => onAnswer(button.label, answerFor(button.id))}
              className={`min-h-11 px-3.5 py-2 rounded-full border border-outline-200 bg-blue-50 ${
                disabled ? "opacity-40" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-typography-900">
                {button.label}
              </Text>
            </Pressable>
          ))}
        </Box>
      )}
    </VStack>
  );
}
