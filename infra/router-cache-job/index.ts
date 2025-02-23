import * as k8s from "@pulumi/kubernetes";

import { regions, routerVersion } from "../config";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { getNameSafe } from "../util";

for (const region of regions) {
  const routerCacheJobName = `router-cache-job-${getNameSafe(routerVersion)}-${getNameSafe(region.region)}`;
  new k8s.batch.v1.Job(routerCacheJobName, {
    metadata: {
      name: routerCacheJobName,
      labels: {
        name: routerCacheJobName,
      },
    },
    spec: {
      backoffLimit: 4, // Number of retries before considering job as failed
      ttlSecondsAfterFinished: 100, // Clean up completed jobs after 100 seconds
      template: {
        spec: {
          restartPolicy: "OnFailure",
          initContainers: [getRouterCacheInitContainer(region)],
          containers: [
            {
              name: routerCacheJobName,
              image: "busybox:1.36",
              command: [
                "sh",
                "-c",
                "sleep 5 && echo 'Job completed successfully'",
              ],
            },
          ],
        },
      },
    },
  });
}
