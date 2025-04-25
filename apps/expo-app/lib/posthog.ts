// eslint-disable-next-line import/no-named-as-default
import PostHog from "posthog-react-native";

export const posthog = new PostHog(
  "phc_WNhfAOhT5sXnDs0mMuHbBDTprULtstAT4TUlv2bWurL",
  {
    host: "https://ph.ridi.bike",
    disabled: __DEV__,
  },
);
