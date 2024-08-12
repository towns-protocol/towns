const { build } = require("esbuild");

build({
  entryPoints: ["src/server.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node20",
  outfile: "dist/server.cjs",
  sourcemap: "inline",
  minify: true,
  treeShaking: true,
  tsconfig: "tsconfig.json",
  external: [
    // esbuild cannot bundle native modules
    "@datadog/native-metrics",

    // required if you use profiling
    "@datadog/pprof",
  ],
}).catch(() => process.exit(1));
