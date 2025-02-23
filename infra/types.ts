export type K8sNode = {
  name: string;
  labels: {
    "node-role.kubernetes.io/control-plane"?: "true" | "false";
    "node-role.kubernetes.io/master"?: "true" | "false";
    "node-role.kubernetes.io/worker"?: "true" | "false";
    "node.longhorn.io/create-default-disk"?: "true" | "false";
  };
};
