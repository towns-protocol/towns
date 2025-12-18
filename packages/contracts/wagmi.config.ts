import { defineConfig } from "@wagmi/cli";
import { foundry } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "typings/index.ts",
  plugins: [
    foundry({
      project: "./",
      artifacts: "out",
      exclude: ["/out/RewardsDistribution.sol/*.json"],
      include: [
        "**/CreateSpace.sol/*.json",
        "**/SpaceOwner.sol/*.json",
        "**/GuardianFacet.sol/*.json",
        "**/PricingModulesFacet.sol/*.json",
        "**/MembershipToken.sol/*.json",
        "**/Banning.sol/*.json",
        "**/MembershipFacet.sol/*.json",
        "**/MembershipMetadata.sol/*.json",
        "**/EntitlementDataQueryable.sol/*.json",
        "**/EntitlementsManager.sol/*.json",
        "**/Roles.sol/*.json",
        "**/Channels.sol/*.json",
        "**/TokenPausableFacet.sol/*.json",
        "**/ReferralsFacet.sol/*.json",
        "**/ReviewFacet.sol/*.json",
        "**/SpaceEntitlementGated.sol/*.json",
        "**/TippingFacet.sol/*.json",
        "**/MainnetDelegation.sol/*.json",
        "**/EntitlementChecker.sol/*.json",
        "**/NodeOperatorFacet.sol/*.json",
        "**/SpaceDelegationFacet.sol/*.json",
        "**/RewardsDistributionV2.sol/*.json",
        "**/XChain.sol/*.json",
        "**/SwapFacet.sol/*.json",
        "**/SwapRouter.sol/*.json",
        "**/IAppRegistry.sol/*.json",
        "**/IAppFactory.sol/*.json",
        "**/IIdentityRegistry.sol/*.json",
        "**/IReputationRegistry.sol/*.json",
        "**/SubscriptionModuleFacet.sol/*.json",
      ],
      forge: {
        build: false,
      },
    }),
  ],
});
