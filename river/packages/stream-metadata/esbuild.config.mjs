import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

build({
	bundle: true,
	entryPoints: { node_esbuild: "./src/node.ts" }, // Rename the entry point to control the output file name
	format: "cjs",
	logLevel: "info",
	loader: {
		".ts": "ts",
		".wasm": "file",
	},
	outdir: "dist",
	outExtension: { ".js": ".cjs" }, // Ensure the output file has .cjs extension
	platform: "node",
	plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
	sourcemap: "inline",
	target: "es2022",
	minify: false, // No minification for easier debugging. Add minification in production later
	treeShaking: true, // Enable tree shaking to remove unused code
}).catch((e) => {
	console.error(e);
	process.exit(1);
});
