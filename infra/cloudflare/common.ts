import * as pulumi from "@pulumi/pulumi";

export const projectName = pulumi.getProject();
const config = new pulumi.Config();

export const accountId = config.require("cloudflare_account_id");
export const zoneId = config.require("cloudflare_zone_id");
export const domain = config.require("cloudflare_domain");
