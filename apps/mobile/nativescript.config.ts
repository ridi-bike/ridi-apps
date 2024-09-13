import type { NativeScriptConfig } from "@nativescript/core";

export default {
	id: "bike.ridi.app",
	appPath: "src",
	appResourcesPath: "App_Resources",
	android: {
		v8Flags: "--expose_gc",
		markingMode: "none",
	},
	cli: {
		packageManager: "pnpm",
	},
} as NativeScriptConfig;
