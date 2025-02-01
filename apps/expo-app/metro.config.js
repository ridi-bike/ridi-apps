const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);
// config.resolver.unstable_enableSymlinks = true;
// config.resolver.unstable_enablePackageExports = true;
// config.resolver.unstable_conditionNames = [
//   "browser",
//   "require",
//   "react-native",
// ];
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "hono/client") {
    return {
      type: "sourceFile",
      filePath: path.resolve("../", "node_modules/hono/dist/client/index.js"),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
