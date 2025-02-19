import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";
import {
  getCacheLocation,
  getPbfLocation,
  regions,
  ridiDataRootPath,
  routerVersion,
} from "../constants";

import * as k8s from "@pulumi/kubernetes";
import { ridiNamespace } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";
import { getRouterCacheInitContainer } from "../router-cache-init";
import { regionVolumeClaims } from "../longhorn-storage";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const routerServiceName = "router-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}:latest`;

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

for (const region of regions) {
  const storage = regionVolumeClaims[region.name];
  const regionServiceName = `${routerServiceName}-${region.name.replace("/", "-")}`;
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
            initContainers: [
              getMapDataInitContainer(region),
              getRouterCacheInitContainer(region),
            ],
            containers: [
              {
                name: regionServiceName,
                image: routerServiceImage.ref,
                env: [
                  {
                    name: "REGION",
                    value: region.name,
                  },
                  {
                    name: "PBF_LOCATION",
                    value: getPbfLocation(region.name),
                  },
                  {
                    name: "CACHE_LOCATION",
                    value: getCacheLocation(region.name),
                  },
                  {
                    name: "ROUTER_VERSION",
                    value: routerVersion,
                  },
                ],
                resources: {
                  requests: {
                    memory: `${region.memory}Mi`,
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
                    name: "ridi-data volume",
                  },
                ],
              },
            ],
            volumes: [
              {
                name: storage.name,
                persistentVolumeClaim: {
                  claimName: storage.claim.metadata.name,
                },
              },
            ],
            nodeSelector: {
              "beta.kubernetes.io/os": "linux",
            },
          },
        },
      },
    },
  );

  const routerService = new k8s.core.v1.Service(regionServiceName, {
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
}
