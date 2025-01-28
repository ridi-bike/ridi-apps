import { View } from "react-native";

type ScreenCardProps = {
  top: React.ReactNode;
  middle: React.ReactNode;
  bottom: React.ReactNode;
};

export function ScreenCard({ top, middle, bottom }: ScreenCardProps) {
  return (
    <View
      role="article"
      className="w-full rounded-2xl border-2 border-black bg-white p-6 shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <View className="mb-6 h-56 overflow-hidden rounded-xl border-2 border-black dark:border-gray-700">
        {top}
      </View>
      <View className="mb-4">{middle}</View>
      <View className="flex flex-row border-t-2 border-black pt-4 text-base dark:border-gray-700">
        {bottom}
      </View>
    </View>
  );
}
