import * as k8s from "@pulumi/kubernetes";

import { regions, routerVersion } from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe } from "../util";

for (const region of regions) {
  const routerCacheJobName = `router-cache-job-${getNameSafe(routerVersion)}-${getNameSafe(region.region)}`;
  new k8s.batch.v1.Job(
    routerCacheJobName,
    {
      metadata: {
        name: routerCacheJobName,
        namespace: ridiNamespace.metadata.name,
        labels: {
          name: routerCacheJobName,
        },
        annotations: {
          "pulumi.com/skipAwait": "true",
        },
      },
      spec: {
        backoffLimit: 4, // Number of retries before considering job as failed
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
            volumes: [ridiDataVolumeSetup.volume],
            imagePullSecrets: [
              {
                name: ghcrSecret.metadata.name,
              },
            ],
          },
        },
      },
    },
    {
      deleteBeforeReplace: true,
      replaceOnChanges: ["*"],
    },
  );
}
