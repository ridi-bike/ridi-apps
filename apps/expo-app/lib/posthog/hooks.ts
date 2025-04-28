import { useGlobalSearchParams, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";

import { posthog } from "./index";

export function usePhScreenCapture() {
  const segments = useSegments();
  const params = useGlobalSearchParams();

  const segmentPath = useMemo(() => `/${segments.join("/")}`, [segments]);

  // useEffect(() => {
  //   posthog.screen(segmentPath, {
  //     ...params,
  //   });
  // }, [segmentPath, params]);
}
