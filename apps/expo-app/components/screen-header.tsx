import { type NativeStackHeaderProps } from "@react-navigation/native-stack/src/types";
import { Link } from "expo-router";
import { ArrowLeft, UserCircle } from "lucide-react-native";
import { View, Text, Pressable } from "react-native";

type ScreenHeaderProps = {
  headerProps: NativeStackHeaderProps;
  title: string;
  onGoBack?: () => void;
};

export function ScreenHeader(props: ScreenHeaderProps) {
  return (
    <View className="fixed top-0 mx-auto flex h-16 w-full flex-row items-center justify-between border-b border-gray-200 bg-white px-6 md:px-8 dark:border-gray-700 dark:bg-gray-900">
      <View className="flex h-full w-14 items-center justify-center">
        {(props.onGoBack || props.headerProps.navigation.canGoBack()) && (
          <Pressable
            role="button"
            onPress={() => {
              if (props.onGoBack) {
                props.onGoBack();
              } else {
                props.headerProps.navigation.goBack();
              }
            }}
          >
            <ArrowLeft className="size-10 text-[#FF5937]" />
          </Pressable>
        )}
      </View>
      <Text
        role="heading"
        aria-level={1}
        className="text-2xl font-bold tracking-tight text-[#FF5937]"
      >
        {props.title}
      </Text>
      <Link
        role="button"
        className="flex size-10 items-center justify-center text-gray-600 transition-colors hover:text-[#FF5937] dark:text-gray-400"
        aria-label="Profile"
        href="/settings"
      >
        <UserCircle className="size-8" />
      </Link>
    </View>
  );
}
