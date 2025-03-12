import NetInfo from "@react-native-community/netinfo";
import { PortalHost } from "@rn-primitives/portal";
import { type Session } from "@supabase/supabase-js";
import {
  QueryClientProvider,
  QueryClient,
  onlineManager,
} from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";

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
  const [session, setSession] = useState<Session | null>(null);

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
        router.replace("/");
      }
      setSession(session);
    }).data.subscription.unsubscribe;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {session && (
        <Stack
          screenOptions={{
            contentStyle: {
              overflow: "hidden",
            },
          }}
        />
      )}
      <PortalHost />
    </QueryClientProvider>
  );
}
