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
}).catch(() => process.exit(1));
