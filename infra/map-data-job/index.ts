import * as k8s from "@pulumi/kubernetes";

import { mapDataVersionDate, regions } from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

const baseHour = 16;
const baseMinute = 15;

function calculateCronSchedule(
  region: (typeof regions)[0],
  index: number,
): string {
  const processingMinutes = Math.ceil(region.pbfSizeMb / (2 * 60));

  const bufferMinutes = Math.ceil(processingMinutes * 0.2);

  const totalDelayMinutes =
    index * (processingMinutes + bufferMinutes) + baseMinute;

  const additionalHours = Math.floor(totalDelayMinutes / 60);
  const minutes = totalDelayMinutes % 60;

  const hour = (baseHour + additionalHours) % 24;

  return `${minutes} ${hour} * * *`;
}

regions.forEach((region, index) => {
  const mapDataJobName = getSafeResourceName(
    `map-data-job-${getNameSafe(region.region)}`,
  );
  new k8s.batch.v1.CronJob(mapDataJobName, {
    metadata: {
      name: mapDataJobName,
      namespace: ridiNamespace.metadata.name,
      labels: {
        name: mapDataJobName,
      },
      annotations: {
        "pulumi.com/skipAwait": "true",
        "ridi.bike/mapDataVersionDate": mapDataVersionDate,
      },
    },
    spec: {
      timeZone: "Etc/UTC",
      schedule: calculateCronSchedule(region, index),
      concurrencyPolicy: "Forbid",
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      jobTemplate: {
        spec: {
          backoffLimit: 1,
          template: {
            spec: {
              restartPolicy: "OnFailure",
              initContainers: [getMapDataInitContainer(region)],
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
      },
    },
  });
});
