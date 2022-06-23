/// <reference types="vitest" />
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    environment: "happy-dom",
    deps: {
      fallbackCJS: true,
    },
  },
  plugins: [tsconfigPaths(), vanillaExtractPlugin()],
});
