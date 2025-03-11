import { type Session } from "@supabase/supabase-js";
import { useRouter, Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Link } from "~/components/link";
import { supabase } from "~/lib/supabase";
import { useEffectOnce } from "~/lib/utils";

export default function Index() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  useEffectOnce(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      console.log({ session });
      if (session && !session.user.is_anonymous) {
        router.replace("/plans");
      } else {
        setSession(session);
      }
    }).data.subscription.unsubscribe;
  });

  return (
    <View className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6 dark:bg-gray-700">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex w-full max-w-[375px] flex-col items-center">
        <View className="mb-16">
          <Text className="text-6xl font-bold tracking-tight text-[#FF5937]">
            Ridi
          </Text>
        </View>
        <View className="w-full space-y-4">
          {session && (
            <>
              <Link
                variant="primary"
                className="dark:border-gray-200 dark:bg-gray-700"
                fullWidth
                href="/login"
                replace
              >
                <Text className="dark:text-gray-200">Sign in</Text>
              </Link>
              <Link
                variant="secondary"
                className="dark:border-gray-200 dark:bg-gray-700"
                fullWidth
                href="/plans"
                replace
              >
                <Text className="dark:text-gray-200">Try it out</Text>
              </Link>
            </>
          )}
        </View>
      </View>
    </View>
  );
}
