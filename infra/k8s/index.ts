import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { nodes } from "../config";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

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

export const containerRegistryUrl = `${config.require("container_registry_url")}/${config.require("container_registry_namespace")}`;
const username = config.require("container_registry_url");
const password = config.require("container_registry_url");
const dockerConfig = {
  auths: {
    [containerRegistryUrl]: {
      username,
      password,
      auth: Buffer.from(`${username}:${password}`).toString("base64"),
    },
  },
};
const ghrSecretName = "github-container-registry-secret";
export const ghcrSecret = new k8s.core.v1.Secret(ghrSecretName, {
  metadata: {
    name: ghrSecretName,
    namespace: ridiNamespace.metadata.name,
  },
  type: "kubernetes.io/dockerconfigjson",
  data: {
    ".dockerconfigjson": Buffer.from(JSON.stringify(dockerConfig)).toString(
      "base64",
    ),
  },
});

nodes.forEach((node) => {
  new k8s.core.v1.NodePatch(node.name, {
    metadata: {
      name: node.name,
      labels: node.labels,
    },
  });
});
