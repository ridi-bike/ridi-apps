import { Stack } from "expo-router";
import {
  User,
  Map,
  Download,
  CreditCard,
  ChevronRight,
  LogOut,
} from "lucide-react-native";
import { useState } from "react";
import { View, Text, Pressable } from "react-native";

import { apiClient } from "~/lib/api";
import { getSuccessResponseOrThrow } from "~/lib/stores/util";
import { supabase } from "~/lib/supabase";

export default function UserSettings() {
  const [loading, setLoading] = useState(false);

  if (loading) {
    return <Text>Loading</Text>;
  }
  return (
    <View
      role="main"
      className="relative flex min-h-screen w-full flex-col bg-white"
    >
      <Stack.Screen
        options={{
          headerTitle: () => (
            <Text role="heading" aria-level={1} className="text-lg font-medium">
              Settings
            </Text>
          ),
        }}
      />

      {/* Profile Section */}
      <View className="border-b-2 border-black p-4">
        <View className="flex flex-row items-center gap-4">
          <View className="flex size-16 items-center justify-center rounded-full border-2 border-black bg-gray-100">
            <User className="size-8" />
          </View>
          <View>
            <Text role="heading" aria-level={2} className="font-medium">
              John Doe
            </Text>
            <Text className="text-sm text-gray-500">john.doe@example.com</Text>
          </View>
        </View>
      </View>

      {/* Statistics Section */}
      <View className="border-b-2 border-black p-4">
        <Text
          role="heading"
          aria-level={3}
          className="mb-3 text-sm text-gray-500"
        >
          Statistics
        </Text>
        <View className="space-y-3">
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="flex size-8 items-center justify-center rounded-lg bg-[#FF5937]/10">
                <Map className="size-4 text-[#FF5937]" />
              </View>
              <Text className="text-sm">Routes Generated</Text>
            </View>
            <Text className="font-medium">24</Text>
          </View>
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="flex size-8 items-center justify-center rounded-lg bg-[#FF5937]/10">
                <Download className="size-4 text-[#FF5937]" />
              </View>
              <Text className="text-sm">Routes Downloaded</Text>
            </View>
            <Text className="font-medium">18</Text>
          </View>
        </View>
      </View>

      {/* Billing Section */}
      <View className="border-b-2 border-black p-4">
        <Text
          role="heading"
          aria-level={3}
          className="mb-3 text-sm text-gray-500"
        >
          Billing
        </Text>
        <Pressable
          role="button"
          className="flex w-full flex-row items-center justify-between rounded-xl border-2 border-black p-3"
        >
          <View className="flex flex-row items-center gap-3">
            <View className="flex size-8 flex-row items-center justify-center rounded-lg bg-[#FF5937]/10">
              <CreditCard className="size-4 text-[#FF5937]" />
            </View>
            <View className="text-left">
              <Text className="text-sm font-medium">Free Plan</Text>
              <Text className="text-xs text-gray-500">
                Up to 5 routes/month
              </Text>
            </View>
          </View>
          <ChevronRight className="size-5 text-gray-400" />
        </Pressable>
        <Pressable
          onPress={() => {
            setLoading(true);
            apiClient
              .stripeCheckout({
                query: {
                  priceType: "montly",
                },
              })
              .then(
                (urlResp) =>
                  (window.location.href = getSuccessResponseOrThrow(
                    200,
                    urlResp,
                  ).stripeUrl),
              );
          }}
        >
          <Text>Sub Montly</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setLoading(true);
            apiClient
              .stripeCheckout({
                query: {
                  priceType: "yearly",
                },
              })
              .then(
                (urlResp) =>
                  (window.location.href = getSuccessResponseOrThrow(
                    200,
                    urlResp,
                  ).stripeUrl),
              );
          }}
        >
          <Text>Sub yearly</Text>
        </Pressable>
      </View>

      <View className="p-4">
        <Pressable
          role="button"
          className="flex w-full flex-row items-center justify-center gap-2 rounded-xl border-2 border-black px-4 py-3 text-[#FF5937] hover:bg-[#FF5937]/5"
          onPress={() => supabase.auth.signOut()}
        >
          <LogOut className="size-5" />
          <Text className="font-medium">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}
