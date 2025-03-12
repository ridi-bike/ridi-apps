import { router } from "expo-router";
import { View, Text } from "react-native";

import { apiClient } from "~/lib/api";
import { useEffectOnce } from "~/lib/utils";

export default function StripeSuccess() {
  useEffectOnce(() => {
    apiClient
      .stripeSuccess()
      .then(() => router.replace("/plans"))
      .catch(console.error);
  });

  return (
    <View>
      <Text>Successful stripe flow</Text>
    </View>
  );
}
