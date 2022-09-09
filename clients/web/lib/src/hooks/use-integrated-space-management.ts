import { CreateSpaceInfo, RoomIdentifier } from "types/matrix-types";

import { EntitlementType } from "../client/web3/ZionContractTypes";
import { useCallback } from "react";
import { useZionClient } from "./use-zion-client";
import { useZionContext } from "../components/ZionContextProvider";

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = "[Tak][useIntegratedSpaceManagement]";

export function useIntegratedSpaceManagement() {
  const { createSpace, createWeb3Space, spaceManager } = useZionClient();
  const { tokenEntitlementAddress, councilNFTAddress } = useZionContext();

  /**
   * Todo: Pops up MetaMask 3 times to create a space, set token entitlement,
   * and set the networkId. Need to get this down to 1 time.
   */

  const configureTokenEntitlement = useCallback(
    async (roomId: RoomIdentifier, spaceName: string) => {
      console.log(TAG, `Configuring token entitlement`, {
        matrixRoomId: roomId.matrixRoomId,
        spaceName: spaceName,
      });

      let contractSpaceId = 0;
      // Todo: Find the contract spaceId from the spaces. This is a hack. Use
      // the contract's getSpaceInfo(...) once G has implemented it.
      let spaces = undefined;
      if (spaceManager) {
        spaces = await spaceManager.unsigned.getSpaces();
      }
      if (spaces) {
        for (const s of spaces) {
          if (s.name === spaceName) {
            const id = s.spaceId;
            console.log(TAG, `spaceId: ${id.toNumber()}, name: ${s.name}`);
            contractSpaceId = id.toNumber();
            break;
          }
        }
      } else {
        console.log(TAG, `No spaces`);
      }

      if (contractSpaceId > 0 && spaceManager) {
        try {
          console.log(TAG, "invoking addTokenEntitlement", {
            contractSpaceId: contractSpaceId,
            tokenEntitlementAddress: tokenEntitlementAddress,
            councilNFTAddress: councilNFTAddress,
          });

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const txAddEntitlement =
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            await spaceManager.signed.addTokenEntitlement(
              contractSpaceId,
              tokenEntitlementAddress,
              councilNFTAddress,
              1,
              "Council NFT entitlement",
              [EntitlementType.Join],
            );

          console.log(TAG, "txAddEntitlement", txAddEntitlement);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const rxAddEntitlement = await txAddEntitlement.wait();

          console.log(TAG, "rxAddEntitlement", rxAddEntitlement);

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (rxAddEntitlement && rxAddEntitlement.status === 1) {
            console.log(TAG, `Configured token entitlement`);

            const txSetSpaceId =
              await spaceManager.signed.setNetworkIdToSpaceId(
                contractSpaceId,
                roomId.matrixRoomId,
              );

            console.log(TAG, "txSetSpaceId", txSetSpaceId);

            const rxSetSpaceId = await txSetSpaceId.wait();

            console.log(TAG, "rxSetSpaceId", rxSetSpaceId);

            if (rxSetSpaceId && rxSetSpaceId.status === 1) {
              console.log(TAG, `Set setNetworkIdToSpaceId`, {
                contractSpaceId,
                matrixRoomId: roomId.matrixRoomId,
              });
            }
          } else {
            console.error(TAG, "Token entitlement not configured");
          }
        } catch (e: unknown) {
          console.error(TAG, "Exception when configuring token entitlement", e);
        }
      } else {
        console.error(TAG, `Error configuring token entitlement`);
      }
    },
    [councilNFTAddress, spaceManager, tokenEntitlementAddress],
  );

  const createWeb3SpaceIntegrated = useCallback(
    async (createInfo: CreateSpaceInfo) => {
      const id = await createSpace(createInfo);
      console.log(
        TAG,
        `created Matrix space. id: ${id?.matrixRoomId ?? "undefined"}`,
      );
      if (id) {
        try {
          const tx = await createWeb3Space({
            name: createInfo.name,
            visibility: createInfo.visibility,
          });

          console.log(TAG, "tx", tx);

          const receipt = await tx?.wait();

          console.log(TAG, "receipt", receipt);

          // The status of a transaction is 1 is successful or 0 if it was reverted.
          if (receipt && receipt.status === 1) {
            console.log(TAG, `createWeb3Space`, {
              id: id.matrixRoomId,
              receipt,
            });

            await configureTokenEntitlement(id, createInfo.name);
          } else {
            console.error(TAG, "Web3 space was not created");
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          console.error(TAG, e);
        }
      }
      return id;
    },
    [configureTokenEntitlement, createSpace, createWeb3Space],
  );

  return {
    createWeb3Space: createWeb3SpaceIntegrated,
  };
}
