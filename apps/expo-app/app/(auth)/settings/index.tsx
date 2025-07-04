import { type UserResponse } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { Link, router } from "expo-router";
import { User, CreditCard, ChevronRight, LogOut } from "lucide-react-native";
import { AnimatePresence, MotiView } from "moti";
import { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";

import { ErrorBox } from "~/components/error";
import { Link as AppLink } from "~/components/link";
import { Loading } from "~/components/loading";
import { ScreenFrame } from "~/components/screen-frame";
import { posthogClient } from "~/lib/posthog/client.mobile";
import { supabase } from "~/lib/supabase";
import { useUser } from "~/lib/useUser";

export default function UserSettings() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserResponse | null>(null);

  const { user: userWithSub } = useUser();

  const getUser = useCallback(() => {
    supabase.auth.getUser().then(setUser);
  }, []);

  useEffect(() => {
    getUser();
  }, [getUser]);

  return (
    <ScreenFrame
      onGoBack={() =>
        router.canGoBack() ? router.back() : router.replace("/plans")
      }
      title="Settings"
    >
      <AnimatePresence exitBeforeEnter>
        {!user && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key="loading"
            className="flex w-full flex-row items-center justify-center"
          >
            <Loading className="size-12 text-[#ff4a25]" />
          </MotiView>
        )}
        {!!user?.error && (
          <View key="error" className="mx-2 max-w-5xl flex-1">
            <ErrorBox error={user.error} retry={getUser} />
          </View>
        )}
        {user && user.data && user.data.user && (
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key="main"
            role="main"
            className="relative flex min-h-screen w-full flex-col"
          >
            {/* Profile Section */}
            <View className="border-b-2 border-black p-4 dark:border-gray-700">
              <View className="flex flex-row items-center justify-between gap-4">
                <View className="flex flex-row items-center justify-start gap-4">
                  <View className="flex size-16 items-center justify-center rounded-full border-2 border-black bg-gray-100 dark:border-gray-700 dark:bg-gray-700">
                    <User className="size-8 text-[#FF5937]" />
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
            </View>

            {!user.data.user.is_anonymous && (
              <View className="border-b-2 border-black p-4 dark:border-gray-700">
                <Text
                  role="heading"
                  aria-level={3}
                  className="mb-3 text-sm text-gray-500 dark:text-gray-300"
                >
                  Supporter status
                </Text>
                <AnimatePresence exitBeforeEnter>
                  {userWithSub && (
                    <MotiView
                      from={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full"
                    >
                      <Link
                        href="/settings/billing"
                        role="button"
                        className="flex w-full flex-row items-center justify-between rounded-xl border-2 border-black p-3 dark:border-gray-700"
                      >
                        <View className="flex flex-row items-center gap-3">
                          <View className="flex size-8 flex-row items-center justify-center rounded-lg bg-[#FF5937]/10 pl-1">
                            <CreditCard className="size-4 text-[#FF5937]" />
                          </View>
                          <View className="text-left">
                            <Text className="text-sm font-medium dark:text-gray-100">
                              {userWithSub.subType === "stripe" && "Supporting"}
                              {userWithSub.subType === "none" &&
                                `Available downloads: ${userWithSub.downloadCountRemain}`}
                              {userWithSub.subType === "code" && "Ridi friend"}
                            </Text>
                          </View>
                        </View>
                        <ChevronRight className="size-5 text-gray-400" />
                      </Link>
                    </MotiView>
                  )}
                  {!userWithSub && (
                    <MotiView
                      from={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex h-14 w-full flex-row items-center justify-center"
                    >
                      <Loading className="size-12 text-[#ff4a25]" />
                    </MotiView>
                  )}
                </AnimatePresence>
              </View>
            )}

            <View className="p-4">
              {!user.data.user.is_anonymous && (
                <Pressable
                  role="button"
                  className="flex w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-black px-4 py-3 text-[#FF5937] hover:bg-[#FF5937]/5 dark:border-gray-700"
                  onPress={() => {
                    queryClient.clear();
                    supabase.auth.signOut();
                    posthogClient.reset();
                  }}
                >
                  <LogOut className="size-5" />
                  <Text className="font-medium dark:text-gray-100">
                    Sign Out
                  </Text>
                </Pressable>
              )}
              {user.data.user?.is_anonymous && (
                <AppLink
                  variant="primary"
                  className="flex w-full flex-row items-center justify-center"
                  href="/login"
                >
                  Login
                </AppLink>
              )}
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </ScreenFrame>
  );
}
