import * as docker_build from "@pulumi/docker-build";
import type * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { ridiInfraVersion, type Region } from "../config";
import {
  getKmlLocation,
  getKmlRemoteUrl,
  getMapDataLocation,
  getPbfLocation,
  getPbfRemoteUrl,
  ridiDataRootPath,
} from "../config";
import { regionVolumeClaims } from "../longhorn-storage";
import { getNameSafe } from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const containerRegistryUrl = pulumi.interpolate`${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const mapDataInitName = "map-data-init";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${mapDataInitName}:latest`;
const versionTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${mapDataInitName}:${ridiInfraVersion}`;

const mapDataInitImage = new docker_build.Image(mapDataInitName, {
  tags: [versionTag, latestTag],
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
  const storage = regionVolumeClaims[region.region];
  const containerName = `${mapDataInitName}-${getNameSafe(region.region)}`;
  return {
    name: containerName,
    image: mapDataInitImage.tags.get()![0],
    env: [
      {
        name: "REGION",
        value: region.region,
      },
      {
        name: "MAP_DATA_LOCATION",
        value: getMapDataLocation(region.region),
      },
      {
        name: "PBF_REMOTE_URL",
        value: getPbfRemoteUrl(region.region),
      },
      {
        name: "KML_REMOTE_URL",
        value: getKmlRemoteUrl(region.region),
      },
      {
        name: "PBF_LOCATION",
        value: getPbfLocation(region.region),
      },
      {
        name: "KML_LOCATION",
        value: getKmlLocation(region.region),
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
        name: storage.claimName,
      },
    ],
  };
};
