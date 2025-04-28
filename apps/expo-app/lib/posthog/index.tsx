import { PostHogProvider, PostHog } from "posthog-react-native";
import { type PropsWithChildren } from "react";

export const posthog = new PostHog(
  "phc_WNhfAOhT5sXnDs0mMuHbBDTprULtstAT4TUlv2bWurL",
  {
    host: "https://ph.ridi.bike",
    disabled: __DEV__,
    enableSessionReplay: true,
  },
);

export function PhProvider({ children }: PropsWithChildren) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
