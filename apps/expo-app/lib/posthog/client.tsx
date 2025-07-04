import { posthog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { type PropsWithChildren } from "react";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
if (!key) {
  throw new Error("API URL missing in EXPO_PUBLIC_POSTHOG_KEY");
}

posthog.init(key, {
  api_host: "https://ph.ridi.bike",
  capture_pageview: false,
});

export const posthogClient = {
  captureEvent: (name: string, args?: Record<string, unknown>) =>
    posthog.capture(name, args),
  captureScreen: (name: string, args: Record<string, unknown>) =>
    posthog.capture("$pageview", {
      $current_url: name,
      ...args,
    }),
  reset: () => posthog.reset(),
  identify: (distinctId: string, args: Record<string, string | undefined>) =>
    posthog.identify(distinctId, args),
};

export function PhProvider({ children }: PropsWithChildren) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
