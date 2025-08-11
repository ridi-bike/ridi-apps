import * as path from "path";

import * as command from "@pulumi/command";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();

const rootPath = path.resolve(__dirname, "../../");
const migrationPath = path.resolve(__dirname, "../../supabase/migrations");

const migrationHash = new command.local.Command("db-migrate-hash", {
  create: pulumi.interpolate`find ./ -type f -print0 | sort -z | xargs -0 sha1sum | sha1sum`,
  triggers: [new Date().getTime()],
  dir: migrationPath,
});

new command.local.Command("db-migrate", {
  create: pulumi.interpolate`supabase db push --db-url ${config.requireSecret("supabase_db_url_stateful")}`,
  triggers: [migrationHash.stdout],
  dir: rootPath,
});
