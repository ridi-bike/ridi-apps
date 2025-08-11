import { defineConfig } from "cypress";

export default defineConfig({
  env: {
    CYPRESS_RIDI_APP_URL: process.env.CYPRESS_RIDI_APP_URL,
    CYPRESS_TESTMAIL_NAMESPACE: process.env.CYPRESS_TESTMAIL_NAMESPACE,
    CYPRESS_TESTMAIL_DOMAIN: process.env.CYPRESS_TESTMAIL_DOMAIN,
    CYPRESS_TESTMAIL_API_KEY: process.env.CYPRESS_TESTMAIL_API_KEY,
  },
  e2e: {
    baseUrl: process.env.CYPRESS_RIDI_APP_URL,
    experimentalStudio: true,
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
