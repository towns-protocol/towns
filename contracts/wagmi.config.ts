import {defineConfig} from "@wagmi/cli";
import {foundry} from "@wagmi/cli/plugins";

export default defineConfig({
  out: "typings/index.ts",
  plugins: [
    foundry({
      project: "../",
      artifacts: "contracts/out",
      include: ["**/CreateSpace.sol/*.json"],
      forge: {
        build: false,
      },
    }),
  ],
});
