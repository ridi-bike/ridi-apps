const ReactCompilerConfig = {
  /* ... */
};
module.exports = (api) => {
  api.cache(false);
  return {
    plugins: [
      // ["babel-plugin-react-compiler", ReactCompilerConfig], // must run first!
    ],
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
