import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import {
  getCacheLocation,
  getPbfLocation,
  getRegionNameSafe,
  ridiDataRootPath,
  routerVersion,
} from "../constants";
import { Region } from "../types";
import { regionVolumeClaims } from "../longhorn-storage";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const routerCacheInitName = "router-cache-init";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${routerCacheInitName}:latest`;

const routerCacheInitImage = new docker_build.Image(routerCacheInitName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./map-data-init/Containerfile",
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

export const getRouterCacheInitContainer = (
  region: Region,
): pulumi.Input<k8s.types.input.core.v1.Container> => {
  const storage = regionVolumeClaims[region.name];
  const containerName = `${routerCacheInitName}-${getRegionNameSafe(region)}`;
  return {
    name: containerName,
    image: routerCacheInitImage.ref,
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
    volumeMounts: [
      {
        mountPath: ridiDataRootPath,
        name: storage.name,
      },
    ],
  };
};
