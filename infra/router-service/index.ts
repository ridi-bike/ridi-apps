import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import {
  getCacheLocation,
  getPbfLocation,
  regions,
  ridiDataRootPath,
  ridiInfraVersion,
  routerVersion,
} from "../config";
import { ghcrSecret, ridiNamespace } from "../k8s";
import { regionVolumeClaims } from "../longhorn-storage";
import { getNameSafe } from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const routerServiceName = "router-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}:latest`;
const versionTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}:${ridiInfraVersion}`;

const routerServiceImage = new docker_build.Image(routerServiceName, {
  tags: [versionTag, latestTag],
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

for (const region of regions) {
  const storage = regionVolumeClaims[region.region];
  const regionServiceName = `${routerServiceName}-${getNameSafe(region.region)}`;
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
                image: routerServiceImage.tags.get()![0],
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
                volumeMounts: [
                  {
                    mountPath: ridiDataRootPath,
                    name: storage.claimName,
                  },
                ],
              },
            ],
            volumes: [regionVolumeClaims[region.region].volume],
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
