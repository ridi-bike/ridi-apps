import { View } from "react-native";

import { cn } from "~/lib/utils";

type ScreenCardProps = {
  top?: React.ReactNode;
  topClassName?: string;
  middle?: React.ReactNode;
  bottom?: React.ReactNode;
};

export function ScreenCard({
  top,
  topClassName,
  middle,
  bottom,
}: ScreenCardProps) {
  return (
    <View
      role="article"
      className={
        "w-full rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      }
    >
      {!!top && (
        <View
          className={cn(
            "mb-6 h-56 w-full overflow-hidden rounded-xl border-2 border-black dark:border-gray-700",
            topClassName,
          )}
        >
          {top}
        </View>
      )}
      {!!middle && <View className="mb-4 w-full">{middle}</View>}
      {!!bottom && (
        <View className="w-full border-t-2 border-black pt-4 text-base dark:border-gray-700">
          {bottom}
        </View>
      )}
    </View>
  );
}
