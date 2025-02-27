import * as k8s from "@pulumi/kubernetes";

const kedaNamespace = new k8s.core.v1.Namespace("keda", {
  metadata: {
    name: "keda",
    labels: {
      "app.kubernetes.io/name": "keda",
      "app.kubernetes.io/part-of": "keda",
    },
  },
});

new k8s.helm.v3.Release(
  "keda",
  {
    chart: "keda",
    namespace: kedaNamespace.metadata.name,
    repositoryOpts: {
      repo: "https://kedacore.github.io/charts",
    },
    values: {
      serviceAccount: {
        create: true,
        annotations: {},
      },
      rbac: {
        create: true,
      },
      metrics: {
        serviceMonitor: {
          enabled: true, // Enable Prometheus ServiceMonitor
        },
      },
    },
  },
  {
    dependsOn: [kedaNamespace],
  },
);
