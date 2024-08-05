import esbuild from "esbuild";
import { wasmLoader } from "esbuild-plugin-wasm";
import chokidar from "chokidar";
import { spawn } from "child_process";
import dotenv from "dotenv";

let nodeProcess = null;

function startNodeProcess() {
  // Load environment variables from .env.local
  dotenv.config({ path: ".env.local" });
  if (nodeProcess) {
    nodeProcess.kill();
  }

  nodeProcess = spawn("node", ["--enable-source-maps", "dist/server.cjs"], {
    stdio: "inherit",
    env: { ...process.env },
  });
}

// Watch the output file and .env.local file and restart the Node.js process on changes
chokidar
  .watch(["dist/server.cjs", ".env.local", "esbuild.watch.mjs"])
  .on("change", (path) => {
    console.log(`File changed: ${path}. Restarting Node.js process...`);
    startNodeProcess();
  });

esbuild
  .context({
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
  })
  .then((context) => {
    // Enable watch mode
    context.watch();
    console.log("Watching for changes...");
  })
  .catch(() => process.exit(1));
