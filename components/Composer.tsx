import React from "react";
import { Button, ButtonText } from "./ui/button";
import { HStack } from "./ui/hstack";
import { Input, InputField } from "./ui/input";

type ComposerProps = {
  query: string;
  onChangeQuery: (value: string) => void;
  onAsk: () => void;
  disabled?: boolean;
};

export function Composer({
  query,
  onChangeQuery,
  onAsk,
  disabled = false,
}: ComposerProps) {
  return (
    <HStack space="sm" className="items-center">
      <Input className="flex-1 rounded-xl bg-white h-12 border-outline-300 focus:border-primary-500">
        <InputField
          accessibilityLabel="Ask about your spending"
          placeholder="Ask e.g., 'What was my highest charge?'"
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onAsk}
        />
      </Input>
      <Button
        size="lg"
        variant="default"
        isDisabled={disabled}
        onPress={onAsk}
        accessibilityLabel="Ask"
        className="rounded-xl h-12 bg-blue-500 hover:bg-primary-700 active:bg-primary-800 text-white"
      >
        <ButtonText className="font-semibold">Ask</ButtonText>
      </Button>
    </HStack>
  );
}
