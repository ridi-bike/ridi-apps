import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const vectorValues = new pulumi.asset.FileAsset("./better-stack/vector.yaml");
new k8s.helm.v4.Chart("betterstack-vector", {
  chart: "betterstack-logs",
  valueYamlFiles: [vectorValues],
  repositoryOpts: {
    repo: "https://betterstackhq.github.io/logs-helm-chart",
  },
});
