import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { mapDataVersionDateNext, regions, routerVersionNext } from "../config";
import { ghcrSecret, k3sNodes, ridiNamespace, stackName } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

const baseHour = 1;

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
  let regDelayMin = 0;
  k3sNodes.forEach((node, idx) => {
    const { cron, delayMin } = calculateCronSchedule(
      region,
      prevDelay + 15 * idx,
    );
    regDelayMin = delayMin;
    const mapDataJobName =
      pulumi.interpolate`map-${node.metadata.name.apply((v) => v.split("-")[2])}-${getNameSafe(region.region)}`.apply(
        (v) => getSafeResourceName(v),
      );

    new k8s.batch.v1.CronJob(
      `map-job-node-${idx}-${getNameSafe(region.region)}`,
      {
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
          successfulJobsHistoryLimit: 0,
          failedJobsHistoryLimit: 0,
          jobTemplate: {
            spec: {
              backoffLimit: 10,
              template: {
                spec: {
                  nodeSelector: {
                    "node.ridi.bike/name": node.metadata.name,
                  },
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
      },
    );
  });

  return regDelayMin;
}, 0);
