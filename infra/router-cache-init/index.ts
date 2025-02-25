import * as docker_build from "@pulumi/docker-build";
import type * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { routerVersionNext, type Region } from "../config";
import { getCacheLocation, getPbfLocation, ridiDataRootPath } from "../config";
import { containerRegistryUrl } from "../k8s";
import { regionVolumes } from "../longhorn-storage";
import { getNameSafe } from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const routerCacheInitName = "router-cache-init";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerCacheInitName}`;

const routerCacheInitImage = new docker_build.Image(routerCacheInitName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./router-cache-init/Containerfile",
  },
  buildArgs: {
    ROUTER_VERSION: routerVersionNext,
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

export const getRouterCacheInitContainer = (
  region: Region,
): pulumi.Input<k8s.types.input.core.v1.Container> => {
  const containerName = `${routerCacheInitName}-${getNameSafe(region.region)}`;
  return {
    name: containerName,
    image: routerCacheInitImage.ref,
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
        value: routerVersionNext,
      },
    ],
    resources: {
      requests: {
        memory: `${region.peakMemoryUsageMb}Mi`,
      },
    },
    volumeMounts: [
      {
        mountPath: ridiDataRootPath,
        name: regionVolumes[region.region].volume.name,
      },
    ],
  };
};
