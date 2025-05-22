import { defineConfig } from "cypress";

export default defineConfig({
  // setupNodeEvents can be defined in either
  // the e2e or component configuration
  e2e: {
    setupNodeEvents(on, config) {
      on("before:browser:launch", (browser, launchOptions) => {
        if (browser.family === "chromium") {
          launchOptions.args.push("--enable-features=UseOzonePlatform");
          launchOptions.args.push("--ozone-platform=wayland");
        }
        return launchOptions;
      });
      return {
        ...config,
      };
    },
  },
});
