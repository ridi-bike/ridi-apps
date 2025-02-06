import { Stack } from "expo-router";
import { ScrollView, View } from "react-native";

import { ScreenHeader } from "~/components/screen-header";

type ScreenFramePropsn = {
  title: string;
  children: React.ReactNode;
  floating?: React.ReactNode;
};
export function ScreenFrame({ children, floating, title }: ScreenFramePropsn) {
  return (
    <>
      <ScrollView className="mb-12 min-h-screen w-full bg-white dark:bg-gray-900">
        <Stack.Screen
          options={{
            header: (props) => (
              <ScreenHeader headerProps={props} title={title} />
            ),
          }}
        />
        <View
          role="main"
          className="flex flex-row justify-center px-6 pb-24 pt-8 md:px-8"
        >
          {children}
        </View>
      </ScrollView>
      {floating}
    </>
  );
}
