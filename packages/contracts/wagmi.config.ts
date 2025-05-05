import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "typings/index.ts",
  plugins: [
    foundry({
      project: "./",
      artifacts: "out",
      include: [
        "**/CreateSpace.sol/*.json",
        "**/SpaceOwner.sol/*.json",
        "**/MembershipToken.sol/*.json",
        "**/Banning.sol/*.json",
        "**/MembershipFacet.sol/*.json",
        "**/MembershipMetadata.sol/*.json",
        "**/EntitlementDataQueryable.sol/*.json",
        "**/EntitlementsManager.sol/*.json",
        "**/Roles.sol/*.json",
        "**/Channels.sol/*.json",
        "**/TokenPausableFacet.sol/*.json",
        "**/PrepayFacet.sol/*.json",
        "**/ReferralsFacet.sol/*.json",
        "**/ReviewFacet.sol/*.json",
        "**/SpaceEntitlementGated.sol/*.json",
        "**/TippingFacet.sol/*.json",
      ],
      forge: {
        build: false,
      },
    }),
  ],
});
