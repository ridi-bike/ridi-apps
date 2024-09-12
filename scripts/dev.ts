import concurrently from "concurrently";
import open from "open";
import { $ } from "bun";

await $`systemctl is-active docker.socket --quiet || sudo systemctl start docker.socket`;
await $`pnpm dev:db`;

const { result } = concurrently(
	[
		{ command: "pnpm dev:web", name: "web/api", prefixColor: "green" },
		{
			command: "ngrok http http://localhost:3000",
			name: "ngrok",
			prefixColor: "red",
		},
		{
			command: "bun scripts/mobile-set-api-url-env.ts && pnpm dev:mobile",
			name: "mobile",
			prefixColor: "blue",
		},
	],
	{
		prefix: "name",
		killOthers: ["failure", "success"],
		restartTries: 1,
	},
);
result.then(console.log, console.error);

setTimeout(() => {
	open("http://localhost:9876");
	open("http://localhost:3000");
}, 8000);
