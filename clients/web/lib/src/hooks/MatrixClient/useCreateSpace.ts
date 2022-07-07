import { MatrixContext } from "../../components/MatrixContextProvider";
import { ICreateRoomOpts, MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import {
  CreateSpaceInfo,
  makeRoomIdentifier,
  RoomIdentifier,
} from "../../types/matrix-types";

export const useCreateSpace = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);
  return useCallback(
    async (
      createSpaceInfo: CreateSpaceInfo,
    ): Promise<RoomIdentifier | undefined> => {
      try {
        if (matrixClient) {
          const options: ICreateRoomOpts = {
            visibility: createSpaceInfo.visibility,
            name: createSpaceInfo.spaceName,
            is_direct: false,
            creation_content: {
              type: "m.space",
            },
          };
          const response = await matrixClient.createRoom(options);
          console.log("Created space", JSON.stringify(response));
          return makeRoomIdentifier(response.room_id);
        } else {
          console.error("Not logged in. Cannot create room");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating room", ex.stack);
      }
      return undefined;
    },
    [matrixClient],
  );
};
