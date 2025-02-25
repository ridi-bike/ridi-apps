import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { containerRegistryUrl, ghcrSecret, ridiNamespace } from "../k8s";
import { regionServiceList } from "../router-service";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const queueServiceName = "queue-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${queueServiceName}`;

const queueServiceImage = new docker_build.Image(queueServiceName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./queue-service/Containerfile",
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

new k8s.apps.v1.Deployment(queueServiceName, {
  metadata: {
    name: queueServiceName,
    labels: {
      name: queueServiceName,
    },
    namespace: ridiNamespace.metadata.name,
  },
  spec: {
    replicas: 1,
    selector: {
      matchLabels: {
        name: queueServiceName,
      },
    },
    template: {
      metadata: {
        labels: {
          name: queueServiceName,
        },
      },
      spec: {
        containers: [
          {
            name: queueServiceName,
            image: queueServiceImage.ref,
            env: [
              {
                name: "SUPABASE_DB_URL",
                value: config.require("supabase_db_url"),
              },
              {
                name: "ROUTER_SERVICE_LIST",
                value: JSON.stringify(regionServiceList),
              },
            ],
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
        imagePullSecrets: [
          {
            name: ghcrSecret.metadata.name,
          },
        ],
      },
    },
  },
});
