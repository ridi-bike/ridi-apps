import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import { apiUrl } from "./api";
import { accountId, cloudflareProvider, domain, zoneId } from "./common";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

const pagesName = pulumi.interpolate`${projectName}-${stackName}-astro`;

const pagesProject = new cloudflare.PagesProject(
  "asto-app",
  {
    accountId,
    name: pagesName,
    productionBranch: "main",
    deploymentConfigs: {
      production: {
        envVars: {
          PUBLIC_RIDI_API_URL: {
            type: "plain_text",
            value: apiUrl,
          },
        },
      },
    },
  },
  { provider: cloudflareProvider },
);

const astoPath = path.resolve(__dirname, "../../apps/astro-app/");
const distPath = path.resolve(__dirname, "../../apps/astro-app/dist");

const build = new command.local.Command(
  "astro-app-build",
  {
    create: pulumi.interpolate`pnpm build`,
    dir: astoPath,
  },
  {
    dependsOn: [pagesProject],
  },
);

const distArchive = build.stdout.apply(() => {
  return new pulumi.asset.FileArchive(distPath);
});

const deployment = new command.local.Command(
  "astro-app-deployment",
  {
    create: pulumi.interpolate`pnpm exec wrangler pages deploy ${distPath} --project-name=${pagesProject.name}`,
    triggers: [distArchive],
    environment: {
      CLOUDFLARE_ACCOUNT_ID: accountId,
      CLOUDFLARE_API_TOKEN: config.requireSecret("cloudflare_api_token"),
    },
  },
  {
    dependsOn: [pagesProject, build],
  },
);

const dnsRecord = new cloudflare.DnsRecord(
  "pages-dns-record",
  {
    zoneId,
    name: domain,
    content: pulumi.interpolate`${pagesProject.name}.pages.dev`,
    type: "CNAME",
    ttl: 1,
    proxied: true,
  },
  { provider: cloudflareProvider, dependsOn: [deployment] },
);

export const landingUrl = pulumi.interpolate`https://${dnsRecord.name}`;
