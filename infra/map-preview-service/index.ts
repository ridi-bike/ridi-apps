import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import {
  containerRegistryUrl,
  ghcrSecret,
  ridiNamespace,
  stackName,
} from "../k8s";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const mapPreviewServiceName = "map-preview-service";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${mapPreviewServiceName}`;

const port = 3000;

const queueServiceImage = new docker_build.Image(mapPreviewServiceName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./map-preview-service/Dockerfile",
  },
  buildArgs: {
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

const mapPreviewServiceDeployment = new k8s.apps.v1.Deployment(
  mapPreviewServiceName,
  {
    metadata: {
      name: mapPreviewServiceName,
      labels: {
        name: mapPreviewServiceName,
      },
      namespace: ridiNamespace.metadata.name,
      annotations: {
        "pulumi.com/skipAwait": "true",
      },
    },
    spec: {
      replicas: 3,
      strategy: {
        type: "Recreate",
      },
      selector: {
        matchLabels: {
          name: mapPreviewServiceName,
        },
      },
      template: {
        metadata: {
          labels: {
            name: mapPreviewServiceName,
          },
          annotations: {
            "pulumi.com/skipAwait": "true",
          },
        },
        spec: {
          containers: [
            {
              name: mapPreviewServiceName,
              image: queueServiceImage.ref,
              env: [
                {
                  name: "SUPABASE_DB_URL",
                  value: config.require("supabase_db_url_stateful"),
                },
                {
                  name: "PORT",
                  value: port.toString(),
                },
                {
                  name: "R2_ENDPOINT",
                  value: config.require("map_preview_endpoint"),
                },
                {
                  name: "MAP_DATA_BUCKET",
                  value: config.require("map_preview_bucket"),
                },
                {
                  name: "BUCKET_URL",
                  value: config.require("map_preview_bucket_url"),
                },
                {
                  name: "PREVIEW_PREFIX",
                  value: config.require("map_preview_prefix"),
                },
                {
                  name: "R2_ACCESS_KEY",
                  value: config.requireSecret("map_preview_access_key"),
                },
                {
                  name: "R2_SECRET_ACCESS_KEY",
                  value: config.requireSecret("map_preview_access_secret"),
                },
              ],
              startupProbe: {
                exec: {
                  command: [
                    "sh",
                    "-c",
                    "curl --fail localhost:3000/api/health",
                  ],
                },
                failureThreshold: 2,
                initialDelaySeconds: 15,
                successThreshold: 1,
                timeoutSeconds: 10,
              },
              livenessProbe: {
                exec: {
                  command: [
                    "sh",
                    "-c",
                    "curl --fail localhost:3000/api/health",
                  ],
                },
                failureThreshold: 2,
                initialDelaySeconds: 15,
                successThreshold: 1,
                timeoutSeconds: 10,
              },
              ports: [
                {
                  name: "api",
                  containerPort: port,
                },
              ],
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
  },
);
const mapPreviewServiceService = new k8s.core.v1.Service(
  mapPreviewServiceName,
  {
    metadata: {
      name: mapPreviewServiceName,
      labels: {
        name: mapPreviewServiceName,
      },
      namespace: ridiNamespace.metadata.name,
      annotations: {
        "pulumi.com/skipAwait": "true",
      },
    },
    spec: {
      ports: [
        {
          port,
          targetPort: port,
          name: "http",
        },
      ],
      selector: mapPreviewServiceDeployment.spec.template.metadata.labels,
    },
  },
);

export const mapPreviewServiceUrl = pulumi.interpolate`${mapPreviewServiceService.metadata.name}.${ridiNamespace.metadata.name}.svc.cluster.local:${port}`;
