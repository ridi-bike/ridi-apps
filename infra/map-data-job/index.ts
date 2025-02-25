import * as k8s from "@pulumi/kubernetes";

import { mapDataDateVersion, regions } from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe } from "../util";

for (const region of regions) {
  const mapDataJobName = `map-data-job-${mapDataDateVersion}-${getNameSafe(region.region)}`;
  new k8s.batch.v1.Job(
    mapDataJobName,
    {
      metadata: {
        name: mapDataJobName,
        namespace: ridiNamespace.metadata.name,
        labels: {
          name: mapDataJobName,
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
            initContainers: [
              getMapDataInitContainer(region),
              getRouterCacheInitContainer(region),
            ],
            containers: [
              {
                name: mapDataJobName,
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
