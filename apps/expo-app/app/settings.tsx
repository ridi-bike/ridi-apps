import { View, Text, Pressable } from "react-native";
import {
  User,
  Map,
  Download,
  CreditCard,
  ChevronRight,
  LogOut,
} from "lucide-react-native";
import { Stack } from "expo-router";

export default function UserSettings() {
  return (
    <View role="main" className="relative flex flex-col w-full min-h-screen bg-white">
      <Stack.Screen options={{
        headerTitle: () => (
          <Text role="heading" aria-level={1} className="text-lg font-medium">
            Settings
          </Text>
        )
      }} />

      {/* Profile Section */}
      <View className="p-4 border-b-2 border-black">
        <View className="flex flex-row items-center gap-4">
          <View className="w-16 h-16 rounded-full bg-gray-100 border-2 border-black flex items-center justify-center">
            <User className="w-8 h-8" />
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
      <View className="p-4 border-b-2 border-black">
        <Text role="heading" aria-level={3} className="text-sm text-gray-500 mb-3">
          Statistics
        </Text>
        <View className="space-y-3">
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-[#FF5937]/10 flex items-center justify-center">
                <Map className="w-4 h-4 text-[#FF5937]" />
              </View>
              <Text className="text-sm">Routes Generated</Text>
            </View>
            <Text className="font-medium">24</Text>
          </View>
          <View className="flex flex-row items-center justify-between">
            <View className="flex flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-lg bg-[#FF5937]/10 flex items-center justify-center">
                <Download className="w-4 h-4 text-[#FF5937]" />
              </View>
              <Text className="text-sm">Routes Downloaded</Text>
            </View>
            <Text className="font-medium">18</Text>
          </View>
        </View>
      </View>

      {/* Billing Section */}
      <View className="p-4 border-b-2 border-black">
        <Text role="heading" aria-level={3} className="text-sm text-gray-500 mb-3">
          Billing
        </Text>
        <Pressable role="button" className="w-full flex flex-row items-center justify-between p-3 border-2 border-black rounded-xl">
          <View className="flex flex-row items-center gap-3">
            <View className="w-8 h-8 rounded-lg bg-[#FF5937]/10 flex flex-row items-center justify-center">
              <CreditCard className="w-4 h-4 text-[#FF5937]" />
            </View>
            <View className="text-left">
              <Text className="text-sm font-medium">Free Plan</Text>
              <Text className="text-xs text-gray-500">Up to 5 routes/month</Text>
            </View>
          </View>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </Pressable>
      </View>

      {/* Sign Out Button */}
      <View className="p-4">
        <Pressable
          role="button"
          className="w-full flex flex-row items-center justify-center gap-2 px-4 py-3 border-2 border-black rounded-xl text-[#FF5937] hover:bg-[#FF5937]/5"
          onPress={() => console.log("Sign out")}
        >
          <LogOut className="w-5 h-5" />
          <Text className="font-medium">Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
};
