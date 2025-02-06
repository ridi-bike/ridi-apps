import { useStore } from "@nanostores/react";
import { PortalHost } from "@rn-primitives/portal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useRef } from "react";

import {
  registerBackgroundFetchAsync,
  unregisterBackgroundFetchAsync,
} from "~/lib/background";
import { $session } from "~/lib/stores/session-store";
import { supabase } from "~/lib/supabase";
import { useEffectOnce } from "~/lib/utils";

const queryClient = new QueryClient();

export default function App() {
  useEffectOnce(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      $session.set(session);
    });
  });

  const bgSyncRunning = useRef(false);
  const session = useStore($session);
  useEffect(() => {
    if (session && !bgSyncRunning.current) {
      registerBackgroundFetchAsync().then(() => (bgSyncRunning.current = true));
    } else if (!session) {
      supabase.auth.signInAnonymously();
      if (bgSyncRunning.current) {
        unregisterBackgroundFetchAsync().then(
          () => (bgSyncRunning.current = false),
        );
      }
    }
  }, [session]);

  return (
    <QueryClientProvider client={queryClient}>
      <Stack />
      <PortalHost />
    </QueryClientProvider>
  );
}
