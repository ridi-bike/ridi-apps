// app.config.ts
import { defineConfig } from "@solidjs/start/config";
import checker from "vite-plugin-checker";
var app_config_default = defineConfig({
  vite: {
    plugins: [
      checker({
        biome: true,
        typescript: true,
        overlay: true,
        enableBuild: true
      })
    ]
  }
});
export {
  app_config_default as default
};
