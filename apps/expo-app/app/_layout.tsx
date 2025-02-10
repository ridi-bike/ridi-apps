import NetInfo from "@react-native-community/netinfo";
import { PortalHost } from "@rn-primitives/portal";
import { type Session } from "@supabase/supabase-js";
import {
  QueryClientProvider,
  QueryClient,
  onlineManager,
} from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { persister } from "~/lib/stores/async-storage-persister";
import { supabase } from "~/lib/supabase";
import { useEffectOnce } from "~/lib/utils";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
      persister,
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
  const [_session, setSession] = useState<Session | null>(null);

  useEffectOnce(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        supabase.auth.signInAnonymously();
      }
    });
    supabase.auth.getSession();
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
      <PortalHost />
    </QueryClientProvider>
  );
}
