import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import {
  containerRegistryUrl,
  ghcrSecret,
  ridiNamespace,
  stackName,
} from "../k8s";
import { mapPreviewServiceUrl } from "../map-preview-service";
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
    location: "./queue-service/Dockerfile",
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

const serviceListStr = pulumi
  .all(regionServiceList)
  .apply((v) => JSON.stringify(v));

new k8s.apps.v1.Deployment(queueServiceName, {
  metadata: {
    name: queueServiceName,
    labels: {
      name: queueServiceName,
    },
    namespace: ridiNamespace.metadata.name,
    annotations: {
      "pulumi.com/skipAwait": "true",
    },
  },
  spec: {
    replicas: 6,
    strategy: {
      type: "Recreate",
    },
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
        annotations: {
          "pulumi.com/skipAwait": "true",
        },
      },
      spec: {
        hostNetwork: stackName === "dev",
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
                value: serviceListStr,
              },
              {
                name: "MAP_PREVIEW_SERVICE_URL",
                value: mapPreviewServiceUrl,
              },
              {
                name: "RESEND_SECRET",
                value: config.require("resend_secret"),
              },
              {
                name: "RESEND_AUDIENCE_ID",
                value: config.require("resend_audience_id"),
              },
            ],
            startupProbe: {
              exec: {
                command: ["sh", "-c", "curl --fail localhost:3000"],
              },
              failureThreshold: 2,
              initialDelaySeconds: 5,
              successThreshold: 1,
              timeoutSeconds: 10,
            },
            livenessProbe: {
              exec: {
                command: ["sh", "-c", "curl --fail localhost:3000"],
              },
              failureThreshold: 2,
              initialDelaySeconds: 15,
              successThreshold: 1,
              timeoutSeconds: 10,
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
