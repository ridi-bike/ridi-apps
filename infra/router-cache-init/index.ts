import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import {
  getCacheLocation,
  getPbfLocation,
  ridiDataRootPath,
  routerVersion,
} from "../constants.ts";

const projectName = pulumi.getProject();
const config = new pulumi.Config();
// const stack = pulumi.getStack();
// const prevVersion = new pulumi.StackReference(stack).getOutput("version");
// export const version = prevVersion || 0;
//
const mapDataDate = "2025-02-19";

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const mapDataInitName = "map-data-init";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${mapDataInitName}:latest`;

const mapDataInitImage = new docker_build.Image(mapDataInitName, {
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

export const getMapDataInitContainer = (
  region: string,
): pulumi.Input<k8s.types.input.core.v1.Container> => {
  return {
    name: mapDataInitName,
    image: mapDataInitImage.ref,
    env: [
      {
        name: "REGION",
        value: region,
      },
      {
        name: "PBF_LOCATION",
        value: getPbfLocation(region),
      },
      {
        name: "CACHE_LOCATION",
        value: getCacheLocation(region),
      },
      {
        name: "ROUTER_VERSION",
        value: routerVersion,
      },
    ],
    volumeMounts: [
      {
        mountPath: ridiDataRootPath,
        name: "ridi-data volume",
      },
    ],
  };
};
