import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import {
  accountId,
  apiUrl,
  cloudflareProvider,
  domain,
  zoneId,
} from "./common";

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
    environment: {
      EXPO_PUBLIC_SUPABASE_URL: config.require("supabase_url"),
      EXPO_PUBLIC_SUPABASE_ANON_KEY: config.require("supabase_anon_key"),
      EXPO_PUBLIC_API_URL: apiUrl,
      EXPO_PUBLIC_SENTRY_DSN: config.require("sentry_dsn_expo"),
      EXPO_PUBLIC_POSTHOG_KEY: config.require("posthog_key"),
      EXPO_PUBLIC_RIDI_ENV: stackName,
      SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
      SENTRY_ORG: config.require("sentry_org"),
      SENTRY_PROJECT: config.require("sentry_project_expo"),
    },
  },
  {
    dependsOn: [pagesProject],
  },
);

const buildHash = new command.local.Command(
  "expo-app-build-hash",
  {
    create: pulumi.interpolate`find ./ -type f -print0 | sort -z | xargs -0 sha1sum | sha1sum`,
    triggers: [new Date().getTime()],
    dir: distPath,
  },
  { dependsOn: [build] },
);

const relNew = new command.local.Command("expo-app-release-new", {
  create: pulumi.interpolate`pnpm release:web:new`,
  triggers: [buildHash.stdout],
  dir: expoPath,
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_expo"),
  },
});

new command.local.Command("expo-app-deployment", {
  create: pulumi.interpolate`pnpm exec wrangler pages deploy ${distPath} --project-name=${pagesProject.name} --branch=main`,
  triggers: [buildHash.stdout],
  environment: {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_API_TOKEN: config.requireSecret("cloudflare_api_token"),
  },
});

new command.local.Command(
  "expo-app-release-fin",
  {
    create: pulumi.interpolate`pnpm release:web:fin`,
    dir: expoPath,
    environment: {
      SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
      SENTRY_ORG: config.require("sentry_org"),
      SENTRY_PROJECT: config.require("sentry_project_expo"),
    },
  },
  {
    dependsOn: [relNew],
  },
);

const pagesDomain = new cloudflare.PagesDomain(
  "expo-pages-domain",
  {
    accountId,
    name: `app.${domain}`,
    projectName: pagesProject.name,
  },
  { provider: cloudflareProvider },
);

new cloudflare.DnsRecord(
  "expo-pages-dns-record",
  {
    zoneId,
    name: pagesDomain.name,
    content: pulumi.interpolate`${pagesProject.name}.pages.dev`,
    type: "CNAME",
    ttl: 1,
    proxied: true,
  },
  { provider: cloudflareProvider },
);
