import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";

import * as k8s from "@pulumi/kubernetes";
import { ridiNamespace } from "../k8s";
import { getMapDataInitContainer } from "../map-data-init";

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
    ROUTER_VERSION: "v0.6.20",
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

const regions = ["europe/latvia", "europe/greece"];

for (const region of regions) {
  const regionServiceName = `${routerServiceName}-${region.replace("/", "-")}`;
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
            initContainers: [getMapDataInitContainer(region)],
            containers: [
              {
                name: regionServiceName,
                image: routerServiceImage.ref,
                env: [
                  {
                    name: "REGION",
                    value: region,
                  },
                ],
                ports: [
                  {
                    name: "api",
                    containerPort: 3000,
                  },
                ],
                volumeMounts: [
                  {
                    mountPath: "/ridi-data",
                    name: "ridi-data volume",
                  },
                ],
              },
            ],
            volumes: [
              {
                name: "tmp-volume",
                emptyDir: {
                  medium: "Memory",
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
