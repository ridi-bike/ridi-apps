import { useGlobalSearchParams, useSegments } from "expo-router";
import { useEffect, useMemo } from "react";

import { posthogClient } from "./client";

export function usePhScreenCapture() {
  const segments = useSegments();
  const params = useGlobalSearchParams();

  const segmentPath = useMemo(() => `/${segments.join("/")}`, [segments]);

  useEffect(() => {
    posthogClient.captureScreen(segmentPath, {
      ...params,
    });
  }, [segmentPath, params]);
}
