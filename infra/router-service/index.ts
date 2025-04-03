import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import {
  getCacheLocation,
  getPbfLocation,
  mapDataVersionDate,
  regions,
  routerVersion,
} from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { ridiDataVolumeSetup } from "../storage";
import {
  getNameSafe,
  getRouterMemoryRequest,
  getSafeResourceName,
} from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const routerServiceName = "router-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}`;

const port = 3000;

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
    PORT: port.toString(),
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

const regionServiceList = {} as Record<string, pulumi.Output<string>>;

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
        annotations: {
          "ridi.bike/mapDataVersionDate": mapDataVersionDate,
          "ridi.bike/routerVersion": routerVersion,
          "pulumi.com/patchForce": "true",
          "pulumi.com/skipAwait": "true",
        },
      },
      spec: {
        strategy: {
          type: "Recreate",
        },
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
                    value: getPbfLocation(region.region, mapDataVersionDate),
                  },
                  {
                    name: "CACHE_LOCATION",
                    value: getCacheLocation(region.region, mapDataVersionDate),
                  },
                  {
                    name: "ROUTER_VERSION",
                    value: routerVersion,
                  },
                  {
                    name: "PORT",
                    value: port.toString(),
                  },
                  {
                    name: "RAYON_NUM_THREADS",
                    value: "5",
                  },
                ],
                resources: {
                  requests: {
                    memory: getRouterMemoryRequest(region.peakMemoryUsageMb),
                    cpu: "0.01",
                  },
                  limits: {
                    cpu: "6",
                  },
                },
                ports: [
                  {
                    name: "api",
                    containerPort: port,
                  },
                ],
                volumeMounts: [ridiDataVolumeSetup.volumeMount],
                startupProbe: {
                  exec: {
                    command: ["sh", "-c", `curl --fail localhost:${port}`],
                  },
                  initialDelaySeconds: 15,
                  periodSeconds: 30,
                  timeoutSeconds: 10,
                  successThreshold: 1,
                  failureThreshold: 50,
                },
                livenessProbe: {
                  exec: {
                    command: ["sh", "-c", `curl --fail localhost:${port}`],
                  },
                  initialDelaySeconds: 15,
                  periodSeconds: 30,
                  timeoutSeconds: 10,
                  successThreshold: 1,
                  failureThreshold: 2,
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
  const routerServiceService = new k8s.core.v1.Service(regionServiceName, {
    metadata: {
      name: regionServiceName,
      labels: {
        name: regionServiceName,
      },
      namespace: ridiNamespace.metadata.name,
      annotations: {
        "pulumi.com/skipAwait": "true",
      },
    },
    spec: {
      ports: [
        {
          port: port,
          targetPort: port,
          name: "http",
        },
      ],
      selector: routerServiceDeployment.spec.template.metadata.labels,
    },
  });

  const serviceAddress = pulumi.interpolate`${routerServiceService.metadata.name}.${ridiNamespace.metadata.name}.svc.cluster.local:${port}`;
  regionServiceList[region.region] = serviceAddress;
}

export { regionServiceList };
