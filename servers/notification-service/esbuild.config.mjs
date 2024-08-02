import { build } from "esbuild";
import { wasmLoader } from "esbuild-plugin-wasm";

build({
  entryPoints: ["./src/server.ts"],
  bundle: true,
  sourcemap: "inline",
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/server.cjs",
  plugins: [wasmLoader()],
  assetNames: "[name]",
  loader: {
    ".ts": "ts",
    ".wasm": "file",
  },
}).catch(() => process.exit(1));
