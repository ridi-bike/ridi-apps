import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const projectName = pulumi.getProject();

const ridiServicesNamespace = new k8s.core.v1.Namespace(
  `${projectName}-services`,
  {
    metadata: {
      name: `${projectName}-services`,
      labels: {
        environment: pulumi.getStack(),
      },
    },
  },
);

const vectorValues = new pulumi.asset.FileAsset("./vector.yaml");
const betterStackVectorHelmChart = new k8s.helm.v4.Chart("betterstack-vector", {
  chart: "betterstack-logs",
  valueYamlFiles: [vectorValues],
  repositoryOpts: {
    repo: "https://betterstackhq.github.io/logs-helm-chart",
  },
});

const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx", {
  metadata: {
    namespace: ridiServicesNamespace.id,
  },
  spec: {
    selector: { matchLabels: appLabels },
    replicas: 1,
    template: {
      metadata: { labels: appLabels },
      spec: { containers: [{ name: "nginx", image: "nginx" }] },
    },
  },
});
export const name = deployment.metadata.name;
