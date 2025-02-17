import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import "./better-stack/index";

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
