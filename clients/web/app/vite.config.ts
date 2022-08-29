import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";
import { visualizer } from "rollup-plugin-visualizer";
import polyfillNode from "rollup-plugin-polyfill-node";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    polyfillNode(),
    react(),
    tsconfigPaths(),
    checker({ typescript: true }),
    eslintPlugin(),
    vanillaExtractPlugin(),
    visualizer({ filename: "dist/stats.html" }),
  ],
  server: {
    port: 3000,
    hmr: {
      overlay: false,
    },
  },
});
