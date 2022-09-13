import { CreateSpaceInfo, RoomIdentifier } from "types/matrix-types";

import { DataTypes } from "@harmony/contracts/governance/src/contracts/zion-governance/contracts/spaces/ZionSpaceManager";
import { EntitlementType } from "../client/web3/ZionContractTypes";
import { useCallback } from "react";
import { useZionClient } from "./use-zion-client";
import { useZionContext } from "../components/ZionContextProvider";

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = "[useIntegratedSpaceManagement]";

export function useIntegratedSpaceManagement() {
  const { createWeb3SpaceWithTokenEntitlement } = useZionClient();
  const { tokenEntitlementAddress, councilNFTAddress } = useZionContext();

  const createSpaceWithZionTokenEntitlement = useCallback(
    async function (
      createInfo: CreateSpaceInfo,
    ): Promise<RoomIdentifier | undefined> {
      const tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct =
        {
          entitlementModuleAddress: tokenEntitlementAddress,
          tokenAddress: councilNFTAddress,
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
    [
      councilNFTAddress,
      createWeb3SpaceWithTokenEntitlement,
      tokenEntitlementAddress,
    ],
  );

  return {
    createSpaceWithZionTokenEntitlement,
  };
}
