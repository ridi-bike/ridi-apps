import NetInfo from "@react-native-community/netinfo";
import { PortalHost } from "@rn-primitives/portal";
import {
  QueryClientProvider,
  QueryClient,
  onlineManager,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";

import { supabase } from "~/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
      // persister,
    },
  },
});

export default function App() {
  useEffect(() => {
    // eslint-disable-next-line import/no-named-as-default-member
    return NetInfo.addEventListener((state) => {
      const status = !!state.isConnected;
      onlineManager.setOnline(status);
    });
  }, []);

  useEffect(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        supabase.auth.signInAnonymously();
      }
    }).data.subscription.unsubscribe;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack
        screenOptions={{
          contentStyle: {
            overflow: "hidden",
          },
        }}
      />
      <PortalHost />
    </QueryClientProvider>
  );
}
