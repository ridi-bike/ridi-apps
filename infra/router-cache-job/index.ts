import * as k8s from "@pulumi/kubernetes";

import { regions, routerVersion } from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

for (const region of regions) {
  const routerCacheJobName = getSafeResourceName(
    `router-cache-job-${getNameSafe(region.region)}`,
  );
  new k8s.batch.v1.Job(routerCacheJobName, {
    metadata: {
      name: routerCacheJobName,
      namespace: ridiNamespace.metadata.name,
      labels: {
        name: routerCacheJobName,
      },
      annotations: {
        "pulumi.com/skipAwait": "true",
        "ridi.bike/routerVersion": routerVersion,
      },
    },
    spec: {
      backoffLimit: 1, // Number of retries before considering job as failed
      template: {
        spec: {
          restartPolicy: "OnFailure",
          containers: [getRouterCacheInitContainer(region)],
          volumes: [ridiDataVolumeSetup.volume],
          imagePullSecrets: [
            {
              name: ghcrSecret.metadata.name,
            },
          ],
        },
      },
    },
  });
}
