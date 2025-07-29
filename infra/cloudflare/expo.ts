import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import { apiUrl } from "./api";
import { accountId, cloudflareProvider, domain, zoneId } from "./common";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

const pagesName = pulumi.interpolate`${projectName}-${stackName}-expo`;

const pagesProject = new cloudflare.PagesProject(
  "expo-app",
  {
    accountId,
    name: pagesName,
    productionBranch: "main",
    deploymentConfigs: {
      production: {
        envVars: {
          EXPO_PUBLIC_SUPABASE_URL: {
            type: "plain_text",
            value: config.require("supabase_url"),
          },
          EXPO_PUBLIC_SUPABASE_ANON_KEY: {
            type: "plain_text",
            value: config.require("supabase_anon_key"),
          },
          EXPO_PUBLIC_API_URL: {
            type: "plain_text",
            value: apiUrl,
          },
          EXPO_PUBLIC_SENTRY_DSN: {
            type: "plain_text",
            value: config.require("sentry_dsn"),
          },
          EXPO_PUBLIC_POSTHOG_KEY: {
            type: "plain_text",
            value: config.require("posthog_key"),
          },
        },
      },
    },
  },
  { provider: cloudflareProvider },
);

const expoPath = path.resolve(__dirname, "../../apps/expo-app/");
const distPath = path.resolve(__dirname, "../../apps/expo-app/dist");

const build = new command.local.Command(
  "expo-app-build",
  {
    create: pulumi.interpolate`pnpm build:web`,
    triggers: [new Date().getTime()],
    dir: expoPath,
  },
  {
    dependsOn: [pagesProject],
  },
);

const distArchive = new pulumi.asset.FileArchive(distPath);

new command.local.Command(
  "expo-app-release-new",
  {
    create: pulumi.interpolate`pnpm release:web:new`,
    triggers: [distArchive],
    dir: expoPath,
    environment: {
      SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
      SENTRY_ORG: config.require("sentry_org"),
      SENTRY_PROJECT: config.require("sentry_project_expo"),
    },
  },
  {
    dependsOn: [pagesProject, build],
  },
);

const deployment = new command.local.Command(
  "expo-app-deployment",
  {
    create: pulumi.interpolate`pnpm exec wrangler pages deploy ${distPath} --project-name=${pagesProject.name} --branch=main`,
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

new command.local.Command(
  "expo-app-release-fin",
  {
    create: pulumi.interpolate`pnpm release:web:fin`,
    triggers: [distArchive],
    dir: expoPath,
    environment: {
      SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
      SENTRY_ORG: config.require("sentry_org"),
      SENTRY_PROJECT: config.require("sentry_project_expo"),
    },
  },
  {
    dependsOn: [pagesProject, deployment],
  },
);

const pagesDomain = new cloudflare.PagesDomain(
  "expo-pages-domain",
  {
    accountId,
    name: `app.${domain}`,
    projectName: pagesProject.name,
  },
  { provider: cloudflareProvider, dependsOn: [deployment] },
);

const dnsRecord = new cloudflare.DnsRecord(
  "expo-pages-dns-record",
  {
    zoneId,
    name: pagesDomain.name,
    content: pulumi.interpolate`${pagesProject.name}.pages.dev`,
    type: "CNAME",
    ttl: 1,
    proxied: true,
  },
  { provider: cloudflareProvider, dependsOn: [deployment] },
);

// export const expoUrl = pulumi.interpolate`https://${pagesDomain.name}`;
