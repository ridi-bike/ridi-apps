import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

const clusterName = `${projectName}-${stackName}`;

// Get Grafana token for all services
const grafanaToken = config.requireSecret("grafana_token");

// Get service-specific usernames
const metricsUsername = config.require("grafana_metrics_username");
const logsUsername = config.require("grafana_logs_username");
const tracesUsername = config.require("grafana_traces_username");
const profilesUsername = config.require("grafana_profiles_username");

// Create namespace
const k8sNamespace = new k8s.core.v1.Namespace("monitoring", {
  metadata: {
    name: "monitoring",
  },
});

// All configuration values in a single object
const valuesObject = {
  cluster: {
    name: clusterName,
  },
  destinations: [
    {
      name: "grafana-cloud-metrics",
      type: "prometheus",
      url: "https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom/push",
      auth: {
        type: "basic",
        username: metricsUsername,
        password: grafanaToken,
      },
    },
    {
      name: "grafana-cloud-logs",
      type: "loki",
      url: "https://logs-prod-012.grafana.net/loki/api/v1/push",
      auth: {
        type: "basic",
        username: logsUsername,
        password: grafanaToken,
      },
    },
    {
      name: "grafana-cloud-traces",
      type: "otlp",
      protocol: "grpc",
      url: "https://tempo-prod-10-prod-eu-west-2.grafana.net:443",
      auth: {
        type: "basic",
        username: tracesUsername,
        password: grafanaToken,
      },
      metrics: {
        enabled: false,
      },
      logs: {
        enabled: false,
      },
      traces: {
        enabled: true,
      },
    },
    {
      name: "grafana-cloud-profiles",
      type: "pyroscope",
      url: "https://profiles-prod-002.grafana.net:443",
      auth: {
        type: "basic",
        username: profilesUsername,
        password: grafanaToken,
      },
    },
  ],
  clusterMetrics: {
    enabled: true,
    // opencost: {
    //   enabled: true,
    //   metricsSource: "grafana-cloud-metrics",
    //   opencost: {
    //     prometheus: {
    //       // existingSecretName: "grafana-cloud-metrics-grafana-k8s-monitoring",
    //       external: {
    //         url: "https://prometheus-prod-24-prod-eu-west-2.grafana.net/api/prom",
    //       },
    //     },
    //     exporter: {
    //       defaultClusterId: clusterName,
    //     },
    //   },
    // },
    kepler: {
      enabled: true,
    },
  },
  annotationAutodiscovery: {
    enabled: true,
  },
  clusterEvents: {
    enabled: true,
  },
  podLogs: {
    enabled: true,
  },
  applicationObservability: {
    enabled: true,
    receivers: {
      otlp: {
        grpc: {
          enabled: true,
          port: 4317,
        },
        http: {
          enabled: true,
          port: 4318,
        },
      },
      zipkin: {
        enabled: true,
        port: 9411,
      },
    },
  },
  profiling: {
    enabled: true,
  },
  integrations: {
    alloy: {
      instances: [
        {
          name: "alloy",
          labelSelectors: {
            "app.kubernetes.io/name": [
              "alloy-metrics",
              "alloy-singleton",
              "alloy-logs",
              "alloy-receiver",
              "alloy-profiles",
            ],
          },
        },
      ],
    },
  },
  "alloy-metrics": {
    enabled: true,
  },
  "alloy-singleton": {
    enabled: true,
  },
  "alloy-logs": {
    enabled: true,
  },
  "alloy-receiver": {
    enabled: true,
    alloy: {
      extraPorts: [
        {
          name: "otlp-grpc",
          port: 4317,
          targetPort: 4317,
          protocol: "TCP",
        },
        {
          name: "otlp-http",
          port: 4318,
          targetPort: 4318,
          protocol: "TCP",
        },
        {
          name: "zipkin",
          port: 9411,
          targetPort: 9411,
          protocol: "TCP",
        },
      ],
    },
  },
  "alloy-profiles": {
    enabled: true,
  },
};

// Create Helm Release
const grafanaMonitoring = new k8s.helm.v3.Release(
  "grafana-k8s-monitoring",
  {
    chart: "k8s-monitoring",
    namespace: "monitoring",
    repositoryOpts: {
      repo: "https://grafana.github.io/helm-charts",
    },
    atomic: true,
    timeout: 300,
    values: valuesObject,
  },
  {
    dependsOn: [k8sNamespace],
  },
);

// Export the release name
export const releaseName = grafanaMonitoring.name;
