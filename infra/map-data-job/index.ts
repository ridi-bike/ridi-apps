import * as k8s from "@pulumi/kubernetes";

import { mapDataVersionDateNext, regions, routerVersionNext } from "../config";
import { ghcrSecret, ridiNamespace, stackName } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

const baseHour = 12;

function calculateCronSchedule(region: (typeof regions)[0], prevDelay: number) {
  const mbPerMin = 2 * 60;
  const processingMinutes = Math.ceil(region.pbfSizeMb / mbPerMin);

  const totalDelayMinutes = prevDelay + processingMinutes;

  const additionalHours = Math.floor(totalDelayMinutes / 60);
  const minutes = totalDelayMinutes % 60;

  const hour = (baseHour + additionalHours) % 24;

  return { cron: `${minutes} ${hour} * * *`, delayMin: totalDelayMinutes };
}

regions.reduce((prevDelay, region) => {
  const { cron, delayMin } = calculateCronSchedule(region, prevDelay);
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
        "ridi.bike/mapDataVersionDateNext": mapDataVersionDateNext,
        "ridi.bike/routerVersionNext": routerVersionNext,
      },
    },
    spec: {
      timeZone: "Etc/UTC",
      schedule: cron,
      concurrencyPolicy: "Forbid",
      successfulJobsHistoryLimit: 3,
      failedJobsHistoryLimit: 3,
      jobTemplate: {
        spec: {
          backoffLimit: 10,
          template: {
            spec: {
              hostNetwork: stackName === "dev",
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

  return delayMin;
}, 0);
