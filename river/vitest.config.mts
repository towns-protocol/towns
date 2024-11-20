import path from "path";
import os from "os";
import { defineConfig } from "vitest/config";

export const rootConfig = defineConfig({
  test: {
    environment: "node",
    coverage: {
      all: false,
      reporter: process.env.CI ? ["lcov"] : ["text", "json", "html"],
      exclude: ["**/dist/**", "**/*.test.ts", "**/*.test-d.ts"],
    },
    globals: true,
    env: {
      NODE_EXTRA_CA_CERTS: path.join(os.homedir(), "river-ca-cert.pem"),
      NODE_TLS_REJECT_UNAUTHORIZED: "0",
      RIVER_ENV: process.env.RIVER_ENV,
      BASE_CHAIN_ID: process.env.BASE_CHAIN_ID,
      BASE_CHAIN_RPC_URL: process.env.BASE_CHAIN_RPC_URL,
      BASE_REGISTRY_ADDRESS: process.env.BASE_REGISTRY_ADDRESS,
      SPACE_FACTORY_ADDRESS: process.env.SPACE_FACTORY_ADDRESS,
      SPACE_OWNER_ADDRESS: process.env.SPACE_OWNER_ADDRESS,
      RIVER_CHAIN_ID: process.env.RIVER_CHAIN_ID,
      RIVER_CHAIN_RPC_URL: process.env.RIVER_CHAIN_RPC_URL,
      RIVER_REGISTRY_ADDRESS: process.env.RIVER_REGISTRY_ADDRESS,
    },
    testTimeout: 20_000,
  },
});

export default rootConfig;
