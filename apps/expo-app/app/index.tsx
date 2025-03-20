import { type Session } from "@supabase/supabase-js";
import { useRouter, Stack } from "expo-router";
import { Download, Map } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { useCreateSessionFromUrl } from "~/components/auth";
import { Button } from "~/components/button";
import { MotorcycleIcon } from "~/components/icons/motorcycle";
import { Link } from "~/components/link";
import { supabase } from "~/lib/supabase";

export default function Index() {
  const isAuthCallback = useCreateSessionFromUrl();

  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.is_anonymous) {
        router.replace("/plans");
      } else {
        if (!isAuthCallback) {
          if (session) {
            setSession(session);
          }
        }
      }
    }).data.subscription.unsubscribe;
  }, [isAuthCallback, router]);

  return (
    <View
      role="main"
      className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6 dark:bg-gray-900"
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex w-full max-w-[375px] flex-col items-center">
        <View className="mb-16">
          <Text className="text-6xl font-bold tracking-tight text-[#FF5937]">
            Ridi
          </Text>
        </View>
        <View className="mb-12 w-full">
          <View className="relative">
            {/* Step 1 */}
            <View className="mb-8 flex flex-row items-center gap-4">
              <View
                className={
                  "flex size-12 flex-row items-center justify-center rounded-full border-2 border-black bg-[#FF5937] dark:border-gray-700"
                }
              >
                <Map className="size-6 text-white" />
              </View>
              <View className="flex-1">
                <Text
                  role="heading"
                  aria-level={2}
                  className="text-lg font-bold dark:text-gray-100"
                >
                  Generate route
                </Text>
              </View>
            </View>
            {/* Connecting Line 1 */}
            <View
              className={
                "absolute left-6 top-12 h-12 w-[2px] bg-black dark:bg-gray-700"
              }
            />
            {/* Step 2 */}
            <View className="mb-8 flex flex-row items-center gap-4">
              <View
                className={
                  "flex size-12 flex-row items-center justify-center rounded-full border-2 border-black bg-[#FF5937] dark:border-gray-700"
                }
              >
                <Download className="size-6 text-white" />
              </View>
              <View className="flex-1">
                <Text
                  role="heading"
                  aria-level={2}
                  className="text-lg font-bold dark:text-gray-100"
                >
                  Download GPX
                </Text>
              </View>
            </View>
            {/* Connecting Line 2 */}
            <View
              className={
                "absolute left-6 top-32 h-12 w-[2px] bg-black dark:bg-gray-700"
              }
            />
            {/* Step 3 */}
            <View className="flex flex-row items-center gap-4">
              <View
                className={
                  "flex size-12 flex-row items-center justify-center rounded-full border-2 border-black bg-[#FF5937] dark:border-gray-700"
                }
              >
                <MotorcycleIcon className="size-6 fill-white" />
              </View>
              <View className="flex-1">
                <Text
                  role="heading"
                  aria-level={2}
                  className="text-lg font-bold dark:text-gray-100"
                >
                  Ride
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View className="w-full space-y-4">
          <Link variant="primary" fullWidth href="/login" replace>
            <Text className="dark:text-gray-200">Sign in</Text>
          </Link>
          <Button
            variant="secondary"
            fullWidth
            onPress={async () => {
              if (!session) {
                await supabase.auth.signInAnonymously();
              }
              router.replace("/plans");
            }}
          >
            <Text className="dark:text-gray-200">Try it out</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}
