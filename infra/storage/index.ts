import * as k8s from "@pulumi/kubernetes";

import { nodes, ridiDataRootPath } from "../config";
import { ridiNamespace } from "../k8s";

const storageClassName = "local-path-storage-class";
const localPathStorageClass = new k8s.storage.v1.StorageClass(
  storageClassName,
  {
    metadata: {
      name: storageClassName,
      namespace: ridiNamespace.metadata.name,
      annotations: {
        "storageclass.kubernetes.io/is-default-class": "false",
      },
    },
    provisioner: "kubernetes.io/no-provisioner",
    volumeBindingMode: "WaitForFirstConsumer",
    reclaimPolicy: "Retain",
  },
);

const ridiDataPVName = "ridi-data-pv";
const ridiDataStorageSize = "450Gi";
const ridiDataPV = new k8s.core.v1.PersistentVolume(ridiDataPVName, {
  metadata: {
    name: ridiDataPVName,
    namespace: ridiNamespace.metadata.name,
  },
  spec: {
    capacity: {
      storage: ridiDataStorageSize,
    },
    volumeMode: "Filesystem",
    accessModes: ["ReadWriteOnce"],
    persistentVolumeReclaimPolicy: "Retain",
    storageClassName: localPathStorageClass.metadata.name,
    local: {
      path: "/ridi-data",
    },
    nodeAffinity: {
      required: {
        nodeSelectorTerms: [
          {
            matchExpressions: [
              {
                key: "kubernetes.io/hostname",
                operator: "In",
                values: [
                  Object.entries(nodes).find(
                    ([_host, node]) => node.storageNode,
                  )![0],
                ],
              },
            ],
          },
        ],
      },
    },
  },
});

const rididDataPVCName = "ridi-data-pvc";
const ridiDataPVC = new k8s.core.v1.PersistentVolumeClaim(rididDataPVCName, {
  metadata: {
    name: rididDataPVCName,
    namespace: ridiNamespace.metadata.name,
  },
  spec: {
    volumeName: ridiDataPV.metadata.name,
    accessModes: ["ReadWriteOnce"],
    storageClassName: localPathStorageClass.metadata.name,
    resources: {
      requests: {
        storage: ridiDataStorageSize,
      },
    },
  },
});

const ridiDataVolumeName = "ridi-data-volume";
export const ridiDataVolumeSetup: {
  volume: k8s.types.input.core.v1.Volume;
  volumeMount: k8s.types.input.core.v1.VolumeMount;
} = {
  volume: {
    name: ridiDataVolumeName,
    persistentVolumeClaim: {
      claimName: ridiDataPVC.metadata.name,
    },
  },
  volumeMount: {
    name: ridiDataVolumeName,
    mountPath: ridiDataRootPath,
  },
};
