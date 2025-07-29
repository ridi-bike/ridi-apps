import * as fs from "fs";
import * as path from "path";

import * as cloudflare from "@pulumi/cloudflare";
import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

import {
  accountId,
  apiDomain,
  astroUrl,
  cloudflareProvider,
  expoUrl,
  zoneId,
} from "./common";

const projectName = pulumi.getProject();
const stackName = pulumi.getStack();
const config = new pulumi.Config();

const apiPath = path.resolve(__dirname, "../../services/cfw-api/");

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

const workerScriptPath = path.resolve(
  __dirname,
  "../../services/cfw-api/dist/index.js",
);
const workerScriptContent = build.stdout.apply(() => {
  return fs.readFileSync(workerScriptPath, "utf8");
});

const relNew = new command.local.Command("api-worker-release-new", {
  create: pulumi.interpolate`pnpm release:new`,
  triggers: [workerScriptContent],
  dir: apiPath,
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_api"),
  },
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
        type: "secret_text",
        text: config.requireSecret("supabase_db_url_stateless"),
      },
      {
        name: "RIDI_APP_URL",
        type: "plain_text",
        text: expoUrl,
      },
      {
        name: "RIDI_LANDING_URL",
        type: "plain_text",
        text: astroUrl,
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        type: "secret_text",
        text: config.requireSecret("supabase_service_role_key"),
      },
      {
        name: "STRIPE_SECRET_KEY",
        type: "secret_text",
        text: config.requireSecret("stripe_secret_key"),
      },
      {
        name: "STRIPE_PRICE_ID_YEARLY",
        type: "plain_text",
        text: config.requireSecret("stripe_price_id_yearly"),
      },
      {
        name: "STRIPE_WEBHOOK_SECRET",
        type: "secret_text",
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
        type: "secret_text",
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

new cloudflare.WorkersRoute(
  "api-worker-route",
  {
    zoneId: zoneId,
    pattern: `${apiDomain}/*`,
    script: workersScriptResource.scriptName,
  },
  { provider: cloudflareProvider },
);

new cloudflare.WorkersCustomDomain(
  "api-worker-domain",
  {
    accountId,
    environment: "production",
    hostname: apiDomain,
    service: workersScriptResource.scriptName,
    zoneId,
  },
  { provider: cloudflareProvider },
);

new command.local.Command("api-worker-release-fin", {
  create: pulumi.interpolate`pnpm release:fin`,
  triggers: [relNew],
  dir: apiPath,
  environment: {
    SENTRY_AUTH_TOKEN: config.requireSecret("sentry_token"),
    SENTRY_ORG: config.require("sentry_org"),
    SENTRY_PROJECT: config.require("sentry_project_api"),
  },
});
