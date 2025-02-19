import * as k8s from "@pulumi/kubernetes";

import {
  getRegionNameSafe,
  regions,
  volumeSizeMemoryMultiplier,
} from "../constants";

const longhornNamespace = new k8s.core.v1.Namespace("longhorn-namespace", {
  metadata: {
    name: "longhorn-system",
  },
});

const longhornChart = new k8s.helm.v4.Chart("longhorn", {
  chart: "longhorn",
  namespace: longhornNamespace.metadata.name,
  repositoryOpts: {
    repo: "https://charts.longhorn.io",
  },
});

const regionVolumeClaims: Record<
  string,
  { name: string; claim: k8s.core.v1.PersistentVolumeClaim }
> = {};

for (const region of regions) {
  const size = `${region.memory * volumeSizeMemoryMultiplier}Mi`;

  const volumeName = `longhorn-${getRegionNameSafe(region)}-persistant-volume`;
  const longhornPV = new k8s.core.v1.PersistentVolume(volumeName, {
    metadata: {
      name: volumeName,
    },
    spec: {
      capacity: {
        storage: size,
      },
      accessModes: ["ReadWriteMany"],
      csi: {
        driver: "driver.longhorn.io",
        fsType: "ext4",
        volumeHandle: "longhorn-pv",
      },
    },
  });

  const claimName = `longhorn-${getRegionNameSafe(region)}-persistant-volume-claim`;
  const longhornPVC = new k8s.core.v1.PersistentVolumeClaim(claimName, {
    metadata: {
      name: claimName,
    },
    spec: {
      accessModes: ["ReadWriteMany"],
      volumeName: longhornPV.metadata.name,
      resources: {
        requests: {
          storage: size,
        },
      },
    },
  });

  regionVolumeClaims[region.name] = {
    name: `longhorn-storage-${getRegionNameSafe(region)}`,
    claim: longhornPVC,
  };
}

export { regionVolumeClaims };
