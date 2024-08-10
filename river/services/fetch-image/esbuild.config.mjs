import { build } from "esbuild";

build({
	bundle: true,
	entryPoints: ["./src/node.ts"],
	format: "cjs",
	logLevel: "info",
	loader: {
		".ts": "ts",
		".wasm": "file",
	},
	outfile: "dist/node_esbuild.cjs",
	outExtension: { ".js": ".cjs" },
	platform: "node",
	sourcemap: "inline",
	target: "es2022",
}).catch((e) => {
	console.error(e);
	process.exit(1);
});
