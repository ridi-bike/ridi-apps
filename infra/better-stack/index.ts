import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

const config = new pulumi.Config();
const logsUri = config.require("better_stack_logs_uri");
const metricsUri = config.require("better_stack_metrics_uri");
const token = config.requireSecret("better_stack_token");

new k8s.helm.v4.Chart("betterstack-vector", {
  chart: "betterstack-logs",
  repositoryOpts: {
    repo: "https://betterstackhq.github.io/logs-helm-chart",
  },
  values: {
    vector: {
      customConfig: {
        sinks: {
          better_stack_http_sink: {
            uri: logsUri,
            auth: {
              strategy: "bearer",
              token,
            },
          },
          better_stack_http_metrics_sink: {
            uri: metricsUri,
            auth: {
              strategy: "bearer",
              token,
            },
          },
        },
      },
    },
  },
});
