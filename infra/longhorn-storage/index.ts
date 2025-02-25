import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { regions, volumeSizeMemoryMultiplier } from "../config";
import { ridiNamespace } from "../k8s";
import { getNameSafe } from "../util";

const longhornNamespace = new k8s.core.v1.Namespace("longhorn-namespace", {
  metadata: {
    name: "longhorn-system",
  },
});

new k8s.helm.v4.Chart("longhorn", {
  chart: "longhorn",
  namespace: longhornNamespace.metadata.name,
  repositoryOpts: {
    repo: "https://charts.longhorn.io",
  },
});

const storageClassName = "longhorn-storage-class";
const longhornStorageClass = new k8s.storage.v1.StorageClass(storageClassName, {
  metadata: {
    name: storageClassName,
  },
  provisioner: "driver.longhorn.io",
  parameters: {
    numberOfReplicas: "3",
    staleReplicaTimeout: "30",
  },
  reclaimPolicy: "Delete",
  volumeBindingMode: "Immediate",
  allowVolumeExpansion: true,
});
const regionVolumes: Record<
  string,
  {
    volume: k8s.types.input.core.v1.Volume;
  }
> = {};

for (const region of regions) {
  const size = `${(region.pbfSizeMb + region.cacheSizeMb) * volumeSizeMemoryMultiplier}Mi`;

  const volumeName = `longhorn-${getNameSafe(region.region)}-persistant-volume`;
  const longhornPV = new k8s.core.v1.PersistentVolume(
    volumeName,
    {
      metadata: {
        name: volumeName,
        namespace: ridiNamespace.metadata.name,
      },
      spec: {
        storageClassName: longhornStorageClass.metadata.name,
        capacity: {
          storage: size,
        },
        accessModes: ["ReadWriteMany"],
        csi: {
          driver: "driver.longhorn.io",
          fsType: "ext4",
          volumeHandle: volumeName,
        },
      },
    },
    {
      replaceOnChanges: ["*"],
      deleteBeforeReplace: true,
    },
  );

  const claimName = `longhorn-${getNameSafe(region.region)}-persistant-volume-claim`;
  const longhornPVC = new k8s.core.v1.PersistentVolumeClaim(
    claimName,
    {
      metadata: {
        name: claimName,
        namespace: ridiNamespace.metadata.name,
      },
      spec: {
        storageClassName: longhornStorageClass.metadata.name,
        accessModes: ["ReadWriteMany"],
        volumeName: longhornPV.metadata.name,
        resources: {
          requests: {
            storage: size,
          },
        },
      },
    },
    {
      replaceOnChanges: ["*"],
      deleteBeforeReplace: true,
    },
  );

  regionVolumes[region.region] = {
    volume: {
      name: pulumi.interpolate`volume-${longhornPV.metadata.name}`,
      persistentVolumeClaim: {
        claimName: longhornPVC.metadata.name,
      },
    },
  };
}

export { regionVolumes };
