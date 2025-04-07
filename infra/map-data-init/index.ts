import * as docker_build from "@pulumi/docker-build";
import type * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { mapDataVersionDateNext, type Region } from "../config";
import {
  getKmlLocation,
  getKmlRemoteUrl,
  getMapDataLocation,
  getPbfLocation,
  getPbfRemoteUrl,
} from "../config";
import { containerRegistryUrl } from "../k8s";
import { ridiDataVolumeSetup } from "../storage";
import { getNameSafe, getSafeResourceName } from "../util";

const projectName = pulumi.getProject();
const config = new pulumi.Config();

const mapDataInitName = "map-data-init";
const latestTag = pulumi.interpolate`${containerRegistryUrl}/${projectName}/${mapDataInitName}`;

const mapDataInitImage = new docker_build.Image(mapDataInitName, {
  tags: [latestTag],
  context: {
    location: "../",
  },
  dockerfile: {
    location: "./map-data-init/Dockerfile",
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
  const containerName = getSafeResourceName(
    `${mapDataInitName}-${getNameSafe(region.region)}`,
  );
  return {
    name: containerName,
    image: mapDataInitImage.ref,
    env: [
      {
        name: "REGION",
        value: region.region,
      },
      {
        name: "MAP_DATA_LOCATION",
        value: getMapDataLocation(region.region, mapDataVersionDateNext),
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
        value: getPbfLocation(region.region, mapDataVersionDateNext),
      },
      {
        name: "KML_LOCATION",
        value: getKmlLocation(region.region, mapDataVersionDateNext),
      },
      {
        name: "SUPABASE_DB_URL",
        value: config.requireSecret("supabase_db_url"),
      },
    ],
    volumeMounts: [ridiDataVolumeSetup.volumeMount],
  };
};
