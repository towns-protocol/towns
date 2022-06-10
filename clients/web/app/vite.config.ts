import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import eslintPlugin from "vite-plugin-eslint";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    checker({ typescript: true }),
    eslintPlugin({
      exclude: [/.*.css.ts.*/, /node_modules/],
    }),
    vanillaExtractPlugin(),
    visualizer({ filename: "dist/stats.html" }),
  ],
  server: {
    hmr: {
      overlay: false,
    },
  },
});
