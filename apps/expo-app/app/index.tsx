import { type Session } from "@supabase/supabase-js";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import Auth from "~/components/Auth";
import { supabase } from "~/lib/supabase";

export default function Index() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);

  useFocusEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session && !session.user.is_anonymous) {
        router.replace("/plans");
      } else {
        setSession(session);
      }
    });
  });

  return (
    <View className="flex min-h-screen w-full flex-col items-center justify-center bg-white p-6">
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex w-full max-w-[375px] flex-col items-center">
        <View className="mb-16">
          <Text className="text-6xl font-bold tracking-tight text-[#FF5937]">
            Ridi
          </Text>
        </View>
        <View className="w-full space-y-4">{session && <Auth />}</View>
      </View>
    </View>
  );
}
