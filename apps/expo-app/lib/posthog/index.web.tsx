import { posthog } from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { type PropsWithChildren } from "react";

if (!__DEV__) {
  posthog.init("phc_WNhfAOhT5sXnDs0mMuHbBDTprULtstAT4TUlv2bWurL", {
    api_host: "https://ph.ridi.bike",
  });
}

export function PhProvider({ children }: PropsWithChildren) {
  if (__DEV__) {
    return <>{children}</>;
  }
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
