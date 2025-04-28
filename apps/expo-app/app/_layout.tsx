import { PortalHost } from "@rn-primitives/portal";
import * as Sentry from "@sentry/react-native";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import { PostHogProvider } from "posthog-react-native";
import { useEffect } from "react";

import { posthog } from "~/lib/posthog";
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
      } else if (!session.user.is_anonymous) {
        posthog.identify(session.user.id, {
          email: session.user.email,
        });
      }
    }).data.subscription.unsubscribe;
  }, []);

  return (
    <PostHogProvider
      client={posthog}
      autocapture={{
        captureTouches: true,
        captureLifecycleEvents: true,
        captureScreens: true,
        navigation: {
          routeToName: (name, params) => {
            return `${name}/${JSON.stringify(params)}`;
          },
        },
      }}
    >
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
    </PostHogProvider>
  );
});
