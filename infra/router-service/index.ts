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
  const shouldScaleToZero = region.serverStartupS < 10;
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
        },
      },
      spec: {
        replicas: shouldScaleToZero ? 0 : 1,
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
                ],
                resources: {
                  requests: {
                    memory: getRouterMemoryRequest(region.peakMemoryUsageMb),
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
                  httpGet: {
                    path: "/",
                    port: "api",
                    scheme: "HTTP",
                  },
                  initialDelaySeconds: 10,
                  periodSeconds: 10,
                  timeoutSeconds: 5,
                  successThreshold: 1,
                  failureThreshold: 90,
                },
                livenessProbe: {
                  httpGet: {
                    path: "/",
                    port: "api",
                    scheme: "HTTP",
                  },
                  initialDelaySeconds: 15,
                  periodSeconds: 2,
                  timeoutSeconds: 1,
                  successThreshold: 1,
                  failureThreshold: 3,
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

  if (shouldScaleToZero) {
    const zpaServiceAccountName = `${regionServiceName}-zpa-sa`;
    const zpaServiceAccount = new k8s.core.v1.ServiceAccount(
      zpaServiceAccountName,
      {
        metadata: {
          name: zpaServiceAccountName,
          namespace: ridiNamespace.metadata.name,
        },
      },
    );

    const zpaRoleName = `${regionServiceName}-zpa-role`;
    const zpaRole = new k8s.rbac.v1.Role(zpaRoleName, {
      metadata: {
        name: zpaRoleName,
        namespace: ridiNamespace.metadata.name,
      },
      rules: [
        {
          apiGroups: ["apps"],
          resources: ["deployments"],
          verbs: ["get", "list", "watch", "update", "patch"],
        },
        {
          apiGroups: ["apps"],
          resources: ["deployments/scale"],
          verbs: ["get", "update", "patch"],
        },
        {
          apiGroups: [""],
          resources: ["endpoints"],
          verbs: ["get", "list", "watch"],
        },
      ],
    });

    const zpaRoleBindingName = `${regionServiceName}-zpa-rolebinding`;
    const zpaRoleBinding = new k8s.rbac.v1.RoleBinding(zpaRoleBindingName, {
      metadata: {
        name: zpaRoleBindingName,
        namespace: ridiNamespace.metadata.name,
      },
      roleRef: {
        apiGroup: "rbac.authorization.k8s.io",
        kind: "Role",
        name: zpaRole.metadata.name,
      },
      subjects: [
        {
          kind: "ServiceAccount",
          name: zpaServiceAccount.metadata.name,
          namespace: ridiNamespace.metadata.name,
        },
      ],
    });
    const zpaImageLatestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerServiceName}-zpa-image`;
    const zpaImage = new docker_build.Image(`${regionServiceName}-zpa-image`, {
      tags: [zpaImageLatestTag],
      context: {
        location: "./zero-pod-autoscaler/",
      },
      dockerfile: {
        location: "./zero-pod-autoscaler/Dockerfile",
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

    const zpaDeploymentName = `${regionServiceName}-zpa`;
    const zpaDeployment = new k8s.apps.v1.Deployment(
      zpaDeploymentName,
      {
        metadata: {
          name: zpaDeploymentName,
          labels: {
            "app.kubernetes.io/name": zpaDeploymentName,
          },
          namespace: ridiNamespace.metadata.name,
        },

        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "app.kubernetes.io/name": zpaDeploymentName,
            },
          },
          template: {
            metadata: {
              labels: {
                "app.kubernetes.io/name": zpaDeploymentName,
              },
            },
            spec: {
              serviceAccountName: zpaServiceAccount.metadata.name,
              imagePullSecrets: [
                {
                  name: ghcrSecret.metadata.name,
                },
              ],
              containers: [
                {
                  name: "zpa",
                  image: zpaImage.ref,
                  imagePullPolicy: "IfNotPresent",
                  args: [
                    pulumi.interpolate`--namespace=${ridiNamespace.metadata.name}`,
                    pulumi.interpolate`--deployment=${routerServiceDeployment.metadata.name}`,
                    pulumi.interpolate`--address=0.0.0.0:${port}`,
                    pulumi.interpolate`--endpoints=${routerServiceService.metadata.name}`,
                    pulumi.interpolate`--target=${routerServiceService.metadata.name}:${port}`,
                    "--ttl=10m",
                  ],
                  ports: [
                    {
                      name: "proxy",
                      protocol: "TCP",
                      containerPort: 80,
                    },
                  ],
                  resources: {
                    requests: {
                      cpu: "50m",
                      memory: "64Mi",
                    },
                    limits: {
                      cpu: "100m",
                      memory: "128Mi",
                    },
                  },
                },
              ],
            },
          },
        },
      },
      {
        dependsOn: [zpaServiceAccount, zpaRoleBinding],
      },
    );

    const zpaServiceName = `${regionServiceName}-zpa-svc`;
    const zpaService = new k8s.core.v1.Service(zpaServiceName, {
      metadata: {
        name: zpaServiceName,
        labels: {
          "app.kubernetes.io/name": zpaDeployment.metadata.name,
        },
        namespace: ridiNamespace.metadata.name,
      },
      spec: {
        ports: [
          {
            port: port,
            targetPort: port,
            name: "proxy",
          },
        ],
        selector: zpaDeployment.metadata.labels,
      },
    });
    const serviceAddress = pulumi.interpolate`${zpaService.metadata.name}.${ridiNamespace.metadata.name}.svc.cluster.local:${port}`;
    regionServiceList[region.region] = serviceAddress;
  } else {
    const serviceAddress = pulumi.interpolate`${routerServiceService.metadata.name}.${ridiNamespace.metadata.name}.svc.cluster.local:${port}`;
    regionServiceList[region.region] = serviceAddress;
  }
}

export { regionServiceList };
