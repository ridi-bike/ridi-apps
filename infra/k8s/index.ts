import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { nodes } from "../constants";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

export const ridiNamespace = new k8s.core.v1.Namespace(
  `${projectName}-${stackName}`,
  {
    metadata: {
      name: `${projectName}-${stackName}`,
      labels: {
        environment: stackName,
      },
    },
  },
);

nodes.forEach((node) => {
  new k8s.core.v1.NodePatch(node.name, {
    metadata: {
      name: node.name,
      labels: node.labels,
    },
  });
});
