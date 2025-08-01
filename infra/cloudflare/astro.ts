import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import {
  accountId,
  apiUrl,
  cloudflareProvider,
  domain,
  expoUrl,
  zoneId,
} from "./common";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();

const workerName = pulumi.interpolate`${projectName}-${stackName}-astro`;

const astoPath = path.resolve(__dirname, "../../apps/astro-app/");
const distPath = path.resolve(__dirname, "../../apps/astro-app/dist");

const build = new command.local.Command("astro-app-build", {
  create: pulumi.interpolate`pnpm build`,
  triggers: [new Date().getTime()],
  dir: astoPath,
  environment: {
    PUBLIC_RIDI_API_URL: apiUrl,
    PUBLIC_RIDI_APP_URL: expoUrl,
    PUBLIC_RIDI_DOMAIN: domain,
  },
});

const distArchive = build.stdout.apply(() => {
  return new pulumi.asset.FileArchive(distPath);
});

const deploy = new command.local.Command("astro-app-deploy", {
  create: pulumi.interpolate`pnpm exec wrangler deploy \
    --name ${workerName} \
    --main "/dist/_worker.js/index.js" \
    --compatibility-date "2025-03-25" \
    --compatibility-flags "nodejs_compat" \
    --assets "${distPath}" \
    --var "PUBLIC_RIDI_API_URL=${apiUrl}" \
    --var "PUBLIC_RIDI_DOMAIN=${domain}" \
    --var "NODE_VERSION=22.0.0" \
    --observability-enabled`,
  triggers: [distArchive],
  dir: astoPath,
});

const workersRoute = new cloudflare.WorkersRoute(
  "api-worker-route",
  {
    zoneId: zoneId,
    pattern: `${domain}/*`,
    script: workerName,
  },
  { provider: cloudflareProvider, dependsOn: [deploy] },
);

new cloudflare.WorkersCustomDomain(
  "api-worker-domain",
  {
    accountId,
    environment: "production",
    hostname: domain,
    service: workerName,
    zoneId,
  },
  { provider: cloudflareProvider, dependsOn: [workersRoute] },
);
