import { PortalHost } from "@rn-primitives/portal";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { router, Stack, useSegments } from "expo-router";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { useEffect } from "react";

import { PhProvider, posthogClient } from "~/lib/posthog/client.mobile";
import { supabase } from "~/lib/supabase";

let env = process.env.EXPO_PUBLIC_RIDI_ENV;

if (!env) {
  env = "local";
}

Sentry.init({
  enabled: !__DEV__,
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  autoSessionTracking: true,
  attachScreenshot: true,
  environment: env,
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

  const segments = useSegments();
  useEffect(() => {
    return supabase.auth.onAuthStateChange((_event, session) => {
      const inAuthGroup = segments[0] === "(auth)";
      if (!session) {
        // Only redirect unauthenticated users when accessing protected routes
        if (inAuthGroup) {
          router.replace("/login");
        }
      } else if (!session.user.is_anonymous) {
        posthogClient.identify(session.user.id, {
          email: session.user.email,
        });
      }
    }).data.subscription.unsubscribe;
  }, [segments]);

  return (
    <PhProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              overflow: "hidden",
            },
          }}
        />
        <PortalHost />
      </QueryClientProvider>
    </PhProvider>
  );
});
