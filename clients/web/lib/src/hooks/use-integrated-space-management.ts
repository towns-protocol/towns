import { useCallback } from "react";
import { CreateSpaceInfo, RoomIdentifier } from "types/matrix-types";
import { useZionClient } from "./use-zion-client";

/**
 * Combine Matrix space creation and Smart Contract space
 * creation into one function.
 */
const TAG = "[Tak][useIntegratedSpaceManagement]";

/**
 * TODO: Remove this when matrix appservice starts reading directly from blockchain.
 */
export enum TokenRequirement {
  Required = "/require_token",
  None = "/require_none",
}

export function useIntegratedSpaceManagement() {
  const { createSpace, createWeb3Space, getSpaces, sendNotice, spaceManager } =
    useZionClient();

  const configureTokenEntitlement = useCallback(
    async (roomId: RoomIdentifier, spaceName: string) => {
      console.log(TAG, `Configuring token entitlement`, {
        matrixRoomId: roomId.matrixRoomId,
        spaceName: spaceName,
      });

      let contractSpaceId = 0;
      // Find the contract spaceId from the spaces.
      const spaces = await getSpaces();
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
        // TODO: configure the token entitlement

        // Inform the matrix appservice of the entitlement requirment.
        await sendNotice(roomId, TokenRequirement.Required);

        console.log(TAG, `Configured token entitlement`);
      } else {
        console.error(TAG, `Error configuring token entitlement`);
      }
    },
    [getSpaces, sendNotice, spaceManager],
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
