import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";
import {
  getKmlLocation,
  getKmlRemoteUrl,
  getMapDataLocation,
  getPbfLocation,
  getPbfRemoteUrl,
  getRegionNameSafe,
  ridiDataRootPath,
} from "../constants";
import { Region } from "../types";
import { regionVolumeClaims } from "../longhorn-storage";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

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
  region: Region,
): pulumi.Input<k8s.types.input.core.v1.Container> => {
  const storage = regionVolumeClaims[region.name];
  const containerName = `${mapDataInitName}-${getRegionNameSafe(region)}`;
  return {
    name: containerName,
    image: mapDataInitImage.ref,
    env: [
      {
        name: "REGION",
        value: region.name,
      },
      {
        name: "MAP_DATA_LOCATION",
        value: getMapDataLocation(region.name),
      },
      {
        name: "PBF_REMOTE_URL",
        value: getPbfRemoteUrl(region.name),
      },
      {
        name: "KML_REMOTE_URL",
        value: getKmlRemoteUrl(region.name),
      },
      {
        name: "PBF_LOCATION",
        value: getPbfLocation(region.name),
      },
      {
        name: "KML_LOCATION",
        value: getKmlLocation(region.name),
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
