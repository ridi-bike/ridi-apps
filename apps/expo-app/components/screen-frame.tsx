import { Stack } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "~/components/screen-header";
import { usePhScreenCapture } from "~/lib/posthog/hooks";

import { VersionCheck } from "./version-check";

type ScreenFrameProps = {
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
}: ScreenFrameProps) {
  const insets = useSafeAreaInsets();

  usePhScreenCapture();

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
        <VersionCheck />
        <View role="main" className="flex flex-col px-2 pb-24 pt-8 md:px-8">
          {children}
        </View>
      </View>
      {floating}
    </>
  );
}
