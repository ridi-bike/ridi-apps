import { PostHogProvider, PostHog } from "posthog-react-native";
import { type PropsWithChildren } from "react";

const key = process.env.EXPO_PUBLIC_POSTHOG_KEY;
if (!key) {
  throw new Error("API URL missing in EXPO_PUBLIC_POSTHOG_KEY");
}

const posthog = new PostHog(key, {
  host: "https://ph.ridi.bike",
  enableSessionReplay: true,
});

export const posthogClient = {
  captureEvent: (name: string, args?: Record<string, unknown>) =>
    // @ts-expect-error mobile version different ts
    posthog.capture(name, args),
  captureScreen: (name: string, args: Record<string, unknown>) =>
    // @ts-expect-error mobile version different ts
    posthog.screen(name, args),
  reset: () => posthog.reset(),
  identify: (distinctId: string, args: Record<string, string | undefined>) =>
    // @ts-expect-error mobile version different ts
    posthog.identify(distinctId, args),
};

export function PhProvider({ children }: PropsWithChildren) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
