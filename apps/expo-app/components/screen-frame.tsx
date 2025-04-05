import { Stack } from "expo-router";
import { View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "~/components/screen-header";

type ScreenFramePropsn = {
  title: string;
  children: React.ReactNode;
  floating?: React.ReactNode;
  onGoBack?: () => void;
};
export function ScreenFrame({
  children,
  floating,
  title,
  onGoBack,
}: ScreenFramePropsn) {
  const insets = useSafeAreaInsets();
  return (
    <>
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }}
        className="my-12 min-h-screen w-full bg-white dark:bg-gray-900"
      >
        <Stack.Screen
          options={{
            header: (props) => (
              <ScreenHeader
                headerProps={props}
                title={title}
                onGoBack={onGoBack}
              />
            ),
          }}
        />
        <View role="main" className="flex flex-col px-2 pb-24 pt-8 md:px-8">
          <View className="mb-2 mr-8 flex w-full flex-col rounded-xl border border-red-400 p-2">
            <Text className="text-lg text-red-400">
              The volume of routing requests is unexpectedly high.
            </Text>
            <Text className="text-lg text-red-400">
              I am currently working on adding server capacity.
            </Text>
            <Text className="text-lg text-red-400">
              Please check back after a day, your routes should be ready.
            </Text>
            <Text className="text-lg text-red-400">
              Apologies for the slowness.
            </Text>
          </View>
          {children}
        </View>
      </View>
      {floating}
    </>
  );
}
