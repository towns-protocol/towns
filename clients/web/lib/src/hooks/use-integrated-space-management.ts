import { CreateSpaceInfo, RoomIdentifier } from "types/matrix-types";

import { DataTypes } from "@harmony/contracts/governance/types/ZionSpaceManager";
import { EntitlementType } from "../client/web3/ZionContractTypes";
import { useCallback } from "react";
import { useZionClient } from "./use-zion-client";
import { getContractAddresses } from "../client/web3/ZionContractAddresses";

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = "[useIntegratedSpaceManagement]";

export function useIntegratedSpaceManagement() {
  const { createWeb3SpaceWithTokenEntitlement, chainId } = useZionClient();

  const createSpaceWithZionTokenEntitlement = useCallback(
    async function (
      createInfo: CreateSpaceInfo,
    ): Promise<RoomIdentifier | undefined> {
      if (!chainId) {
        console.error(
          "createSpaceWithZionTokenEntitlement::chainId is undefined",
        );
        return undefined;
      }
      const addresses = getContractAddresses(chainId);
      const tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct =
        {
          entitlementModuleAddress: addresses.spaceManager.tokengranted,
          tokenAddress: addresses.council.councilnft,
          quantity: 1,
          description: "Zion Council NFT",
          entitlementTypes: [EntitlementType.Join],
        };

      try {
        const roomId = await createWeb3SpaceWithTokenEntitlement(
          createInfo,
          tokenEntitlement,
        );

        return roomId;
      } catch (e: unknown) {
        console.error(TAG, e);
      }

      return undefined;
    },
    [chainId, createWeb3SpaceWithTokenEntitlement],
  );

  return {
    createSpaceWithZionTokenEntitlement,
  };
}
