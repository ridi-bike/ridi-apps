import type React from "react";
import { useMemo } from "react";
import { View, Text, TextInput } from "react-native";

import { cn } from "~/lib/utils";

type InputProps = {
  label: string;
  className?: string;
} & React.ComponentProps<typeof TextInput>;

export const Input = ({ label, className, ...props }: InputProps) => {
  const labelId = useMemo(
    () => `label-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    [label],
  );
  return (
    <View className="w-full">
      <Text
        aria-label={label}
        nativeID={labelId}
        className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200"
      >
        {label}
      </Text>
      <TextInput
        aria-labelledby={labelId}
        aria-label="input"
        className={cn(
          "w-full px-4 py-2 border-2 border-black text-gray-700 dark:text-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5937]",
          className,
        )}
        nativeID=""
        {...props}
      />
    </View>
  );
};
