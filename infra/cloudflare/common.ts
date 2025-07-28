import * as pulumi from "@pulumi/pulumi";
import * as cloudflare from "@pulumi/cloudflare";

export const projectName = pulumi.getProject();
const config = new pulumi.Config();

export const accountId = config.require("cloudflare_account_id");
export const zoneId = config.require("cloudflare_zone_id");
export const domain = config.require("cloudflare_domain");

export const cloudflareProvider = new cloudflare.Provider(
  "cloudflare-provider",
  {
    apiToken: config.requireSecret("cloudflare_api_token"),
  },
);
