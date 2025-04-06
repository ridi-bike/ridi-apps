import { PortalHost } from "@rn-primitives/portal";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect } from "react";

import { supabase } from "~/lib/supabase";

Sentry.init({
  enabled: !__DEV__,
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  autoSessionTracking: true,
  attachScreenshot: true,
  environment: __DEV__ ? "dev" : "prod",
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: false,
      maskAllImages: false,
      maskAllVectors: false,
    }),
  ],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
    },
  },
});

export default Sentry.wrap(function App() {
  useEffect(() => {
    const protocol = new Protocol();
    maplibregl.addProtocol("pmtiles", protocol.tile);
    return () => {
      maplibregl.removeProtocol("pmtiles");
    };
  }, []);

  useEffect(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/");
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
});
