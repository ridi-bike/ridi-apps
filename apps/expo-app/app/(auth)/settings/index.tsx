import { type UserResponse } from "@supabase/supabase-js";
import { Link, router, Stack } from "expo-router";
import {
  User,
  Map,
  Download,
  CreditCard,
  ChevronRight,
  LogOut,
} from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";

import { ErrorBox } from "~/components/error";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import { apiClient } from "~/lib/api";
import { getSuccessResponseOrThrow } from "~/lib/stores/util";
import { supabase } from "~/lib/supabase";

export default function UserSettings() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserResponse | null>(null);

  const getUser = useCallback(() => {
    supabase.auth.getUser().then(setUser);
  }, []);

  useEffect(() => {
    getUser();
  }, [getUser]);

  return (
    <ScreenFrame
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.push("/plans")
      }
      title="Settings"
    >
      <AnimatePresence>
        {!user && <Loading className="size-12 text-[#ff4a25]" />}
        {!!user?.error && (
          <View className="mx-2 max-w-5xl flex-1">
            <ErrorBox error={user.error} retry={getUser} />
          </View>
        )}
        {user && user.data && user.data.user && (
          <MotiView
            role="main"
            className="relative flex min-h-screen w-full flex-col"
          >
            {/* Profile Section */}
            <View className="border-b-2 border-black p-4 dark:border-gray-700">
              <View className="flex flex-row items-center gap-4">
                <View className="flex size-16 items-center justify-center rounded-full border-2 border-black bg-gray-100 dark:border-gray-700 dark:bg-gray-700">
                  <User className="size-8" />
                </View>
                <View>
                  <Text
                    role="heading"
                    aria-level={2}
                    className="font-medium dark:text-gray-100"
                  >
                    {user.data.user.is_anonymous
                      ? "Anonymous"
                      : user.data.user.email || ""}
                  </Text>
                </View>
              </View>
            </View>

            {/* Statistics Section */}
            <View className="border-b-2 border-black p-4 dark:border-gray-700">
              <Text
                role="heading"
                aria-level={3}
                className="mb-3 text-sm text-gray-500 dark:text-gray-300"
              >
                Statistics
              </Text>
              <View className="space-y-3">
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-3">
                    <View className="flex size-8 items-center justify-center rounded-lg bg-[#FF5937]/10">
                      <Map className="size-4 text-[#FF5937]" />
                    </View>
                    <Text className="text-sm dark:text-gray-100">
                      Routes Generated
                    </Text>
                  </View>
                  <Text className="font-medium">24</Text>
                </View>
                <View className="flex flex-row items-center justify-between">
                  <View className="flex flex-row items-center gap-3">
                    <View className="flex size-8 items-center justify-center rounded-lg bg-[#FF5937]/10">
                      <Download className="size-4 text-[#FF5937]" />
                    </View>
                    <Text className="text-sm dark:text-gray-100">
                      Routes Downloaded
                    </Text>
                  </View>
                  <Text className="font-medium dark:text-gray-100">18</Text>
                </View>
              </View>
            </View>

            {/* Billing Section */}
            <View className="border-b-2 border-black p-4 dark:border-gray-700">
              <Text
                role="heading"
                aria-level={3}
                className="mb-3 text-sm text-gray-500 dark:text-gray-300"
              >
                Billing
              </Text>
              <Link
                href="/settings/billing"
                role="button"
                className="flex w-full flex-row items-center justify-between rounded-xl border-2 border-black p-3 dark:border-gray-700"
              >
                <View className="flex flex-row items-center gap-3">
                  <View className="flex size-8 flex-row items-center justify-center rounded-lg bg-[#FF5937]/10">
                    <CreditCard className="size-4 text-[#FF5937]" />
                  </View>
                  <View className="text-left">
                    <Text className="text-sm font-medium dark:text-gray-100">
                      Free Plan
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-300">
                      Up to 5 routes/month
                    </Text>
                  </View>
                </View>
                <ChevronRight className="size-5 text-gray-400" />
              </Link>
            </View>

            <View className="p-4">
              <Pressable
                role="button"
                className="flex w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-black px-4 py-3 text-[#FF5937] hover:bg-[#FF5937]/5 dark:border-gray-700"
                onPress={() => supabase.auth.signOut()}
              >
                <LogOut className="size-5" />
                <Text className="font-medium dark:text-gray-100">Sign Out</Text>
              </Pressable>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
