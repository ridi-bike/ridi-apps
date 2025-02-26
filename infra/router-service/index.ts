import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import {
  getCacheLocation,
  getPbfLocation,
  regions,
  routerVersion,
} from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const routerServiceName = "router-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}`;

const routerServiceImage = new docker_build.Image(routerServiceName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./router-service/Containerfile",
  },
  buildArgs: {
    ROUTER_VERSION: routerVersion,
  },
  cacheFrom: [
    {
      registry: {
        ref: latestTag,
      },
    },
  ],
  cacheTo: [
    {
      registry: {
        ref: latestTag,
      },
    },
  ],
  platforms: ["linux/amd64"],
  push: true,
  registries: [
    {
      address: containerRegistryUrl,
      password: config.requireSecret("container_registry_password"),
      username: config.require("container_registry_username"),
    },
  ],
});

const regionServiceList = {} as Record<string, string>;

// KEDA ScaledObject interface
type KedaScalingConfig = {
  minReplicas: number;
  maxReplicas: number;
  pollingInterval: number;
  cooldownPeriod: number;
};

for (const region of regions) {
  const regionServiceName = getSafeResourceName(
    `${routerServiceName}-${getNameSafe(region.region)}`,
  );
  const routerServiceDeployment = new k8s.apps.v1.Deployment(
    regionServiceName,
    {
      metadata: {
        name: regionServiceName,
        labels: {
          name: regionServiceName,
        },
        namespace: ridiNamespace.metadata.name,
      },
      spec: {
        replicas: 1,
        selector: {
          matchLabels: {
            name: regionServiceName,
          },
        },
        template: {
          metadata: {
            labels: {
              name: regionServiceName,
            },
          },
          spec: {
            containers: [
              {
                name: regionServiceName,
                image: routerServiceImage.ref,
                env: [
                  {
                    name: "REGION",
                    value: region.region,
                  },
                  {
                    name: "PBF_LOCATION",
                    value: getPbfLocation(region.region),
                  },
                  {
                    name: "CACHE_LOCATION",
                    value: getCacheLocation(region.region),
                  },
                  {
                    name: "ROUTER_VERSION",
                    value: routerVersion,
                  },
                  {
                    name: "PORT",
                    value: "3000",
                  },
                ],
                resources: {
                  requests: {
                    memory: `${region.peakMemoryUsageMb}Mi`,
                  },
                },
                ports: [
                  {
                    name: "api",
                    containerPort: 3000,
                  },
                ],
                volumeMounts: [ridiDataVolumeSetup.volumeMount],
                startupProbe: {
                  httpGet: {
                    path: "/",
                    port: 3000,
                  },
                },
                livenessProbe: {
                  httpGet: {
                    path: "/",
                    port: 3000,
                  },
                },
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
  );

  // Create KEDA ScaledObject for deployments
  const canScaleToZero = region.serverStartupS < 10;

  const kedaScaling: KedaScalingConfig = {
    minReplicas: canScaleToZero ? 0 : 1,
    maxReplicas: 5,
    pollingInterval: 10,
    cooldownPeriod: 300,
  };

  new k8s.apiextensions.CustomResource(
    `${regionServiceName}-scaled-object`,
    {
      apiVersion: "keda.sh/v1alpha1",
      kind: "ScaledObject",
      metadata: {
        name: `${regionServiceName}-scaler`,
        namespace: ridiNamespace.metadata.name,
      },
      spec: {
        scaleTargetRef: {
          name: regionServiceName,
          kind: "Deployment",
        },
        minReplicaCount: kedaScaling.minReplicas,
        maxReplicaCount: kedaScaling.maxReplicas,
        pollingInterval: kedaScaling.pollingInterval,
        cooldownPeriod: kedaScaling.cooldownPeriod,
        triggers: [
          {
            type: "kubernetes-workload",
            metadata: {
              podSelector: `name=${regionServiceName}`,
              value: "1",
            },
          },
        ],
        advanced: {
          horizontalPodAutoscalerConfig: {
            behavior: {
              scaleDown: {
                stabilizationWindowSeconds: 300,
                policies: [
                  {
                    type: "Pods",
                    value: 1,
                    periodSeconds: 60,
                  },
                ],
              },
              scaleUp: {
                stabilizationWindowSeconds: 0,
                policies: [
                  {
                    type: "Pods",
                    value: 1,
                    periodSeconds: 10,
                  },
                ],
              },
            },
          },
        },
      },
    },
    {
      dependsOn: [routerServiceDeployment],
    },
  );

  new k8s.core.v1.Service(regionServiceName, {
    metadata: {
      name: regionServiceName,
      labels: {
        name: regionServiceName,
      },
      namespace: ridiNamespace.metadata.name,
    },
    spec: {
      ports: [
        {
          port: 3000,
          targetPort: 3000,
        },
      ],
      selector: routerServiceDeployment.spec.template.metadata.labels,
    },
  });
  regionServiceList[region.region] = regionServiceName;
}

export { regionServiceList };
