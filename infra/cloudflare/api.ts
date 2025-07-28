import * as fs from "fs";
import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import { accountId, cloudflareProvider, domain, zoneId } from "./common";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

const apiPath = path.resolve(__dirname, "../../services/cfw-api/");
const distPath = path.resolve(__dirname, "../../services/cfw-api/dist");

const build = new command.local.Command("worker-api-build", {
  create: pulumi.interpolate`pnpm build`,
  dir: apiPath,
  triggers: [new Date().getTime()],
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_api"),
  },
});

const distArchive = build.stdout.apply(() => {
  return new pulumi.asset.FileArchive(distPath);
});

new command.local.Command("api-worker-release-new", {
  create: pulumi.interpolate`pnpm release:new`,
  triggers: [distArchive],
  dir: apiPath,
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_api"),
  },
});

const workerScriptPath = path.resolve(
  __dirname,
  "../../services/cfw-api/dist/index.js",
);
const workerScriptContent = distArchive.apply(() => {
  return fs.readFileSync(workerScriptPath, "utf8");
});

const workerName = pulumi.interpolate`${projectName}-${stackName}-api`;

const workersScriptResource = new cloudflare.WorkersScript(
  "cloudflare-api",
  {
    content: workerScriptContent,
    scriptName: workerName,
    mainModule: "worker.js",
    accountId,
    compatibilityFlags: ["nodejs_compat"],
    compatibilityDate: "2025-01-29",
    bindings: [
      {
        name: "SUPABASE_URL",
        type: "plain_text",
        text: config.require("supabase_url"),
      },
      {
        name: "SUPABASE_DB_URL",
        type: "plain_text",
        text: config.requireSecret("supabase_db_url"),
      },
      {
        name: "RIDI_APP_URL",
        type: "plain_text",
        text: config.require("stripe_price_id_yearly"),
      },
      {
        name: "RIDI_LANDING_URL",
        type: "plain_text",
        text: config.require("stripe_price_id_yearly"),
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        type: "plain_text",
        text: config.requireSecret("supabase_service_role_key"),
      },
      {
        name: "STRIPE_SECRET_KEY",
        type: "plain_text",
        text: config.requireSecret("stripe_secret_key"),
      },
      {
        name: "STRIPE_PRICE_ID_YEARLY",
        type: "plain_text",
        text: config.requireSecret("stripe_price_id_yearly"),
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        type: "plain_text",
        text: config.requireSecret("stripe_webhook_secret"),
      },
      {
        name: "SENTRY_DSN",
        type: "plain_text",
        text: config.requireSecret("sentry_dsn"),
      },
      {
        name: "RIDI_ENV",
        type: "plain_text",
        text: stackName,
      },
      {
        name: "RESEND_KEY",
        type: "plain_text",
        text: config.requireSecret("resend_secret_key"),
      },
      {
        name: "RESEND_AUD_GENERAL_ID",
        type: "plain_text",
        text: config.requireSecret("resend_audience_id_general"),
      },
    ],
    observability: {
      enabled: true,
    },
  },
  { provider: cloudflareProvider },
);

const subdomain = "api";
const fqdn = `${subdomain}.${domain}`;
const workerRoute = new cloudflare.WorkersRoute(
  "api-worker-route",
  {
    zoneId: zoneId,
    pattern: fqdn,
    script: workersScriptResource.scriptName,
  },
  { provider: cloudflareProvider },
);

const releaseFin = new command.local.Command("api-worker-release-fin", {
  create: pulumi.interpolate`pnpm release:fin`,
  triggers: [distArchive],
  dir: apiPath,
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_api"),
  },
});

const dnsRecord = new cloudflare.DnsRecord(
  "api-worker-dns",
  {
    zoneId: zoneId,
    name: workerRoute.pattern,
    type: "A",
    content: "192.0.2.1",
    ttl: 1,
    proxied: true,
  },
  { provider: cloudflareProvider, dependsOn: [releaseFin] },
);

export const apiUrl = pulumi.interpolate`https://${dnsRecord.name}`;
