import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const betterStackNamespace = new k8s.core.v1.Namespace(
  "better-stack-namespace",
  {
    metadata: {
      name: "better-stack-system",
    },
  },
);

const vectorValues = new pulumi.asset.FileAsset("./better-stack/vector.yaml");
new k8s.helm.v4.Chart("betterstack-vector", {
  chart: "betterstack-logs",
  namespace: betterStackNamespace.metadata.name,
  valueYamlFiles: [vectorValues],
  repositoryOpts: {
    repo: "https://betterstackhq.github.io/logs-helm-chart",
  },
});
