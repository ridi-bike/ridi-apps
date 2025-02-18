import * as pulumi from "@pulumi/pulumi";
import * as docker_build from "@pulumi/docker-build";
import * as k8s from "@pulumi/kubernetes";

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
        name: "MAP_DATA_LOCATION",
        value: `/ridi-data/map-data/${mapDataDate}/${region}`,
      },
      {
        name: "PBF_REMOTE_URL",
        value: `https://download.geofabrik.de/${region}-latest.osm.pbf`,
      },
      {
        name: "KML_REMOTE_URL",
        value: `https://download.geofabrik.de/${region}.html`,
      },
    ],
    volumeMounts: [
      {
        mountPath: "/ridi-data",
        name: "ridi-data volume",
      },
    ],
  };
};
