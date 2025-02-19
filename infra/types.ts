export type Region = {
  name: string;
  memory: number;
};

export type K8sNode = {
  name: string;
  labels: {
    "node-role.kubernetes.io/control-plane"?: "true";
    "node-role.kubernetes.io/master"?: "true";
    "node-role.kubernetes.io/worker"?: "true";
  };
};
