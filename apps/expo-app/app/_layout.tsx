import { PortalHost } from "@rn-primitives/portal";
import { type Session } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useRef, useState } from "react";

import {
  registerBackgroundFetchAsync,
  unregisterBackgroundFetchAsync,
} from "~/lib/background";
import { supabase } from "~/lib/supabase";
import { useEffectOnce } from "~/lib/utils";

const queryClient = new QueryClient();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);

  useEffectOnce(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        supabase.auth.signInAnonymously();
      }
    });
    supabase.auth.getSession();
  });

  const bgSyncRunning = useRef(false);

  useEffect(() => {
    if (session && !bgSyncRunning.current) {
      registerBackgroundFetchAsync().then(() => (bgSyncRunning.current = true));
    } else if (!session && bgSyncRunning.current) {
      unregisterBackgroundFetchAsync().then(
        () => (bgSyncRunning.current = false),
      );
    }
  }, [session]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
      <PortalHost />
    </QueryClientProvider>
  );
}
