import { PortalHost } from "@rn-primitives/portal";
import { type Session } from "@supabase/supabase-js";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect, useState } from "react";

import { supabase } from "~/lib/supabase";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
    },
  },
});

export default function App() {
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  const [session, setSession] = useState<Session | null>(null);

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
