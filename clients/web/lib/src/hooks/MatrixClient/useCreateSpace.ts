import { MatrixContext } from "../../components/MatrixContextProvider";
import { ICreateRoomOpts, MatrixClient, Visibility } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import {
  CreateSpaceInfo,
  makeRoomIdentifier,
  RoomIdentifier,
  ZionContext,
} from "../../types/matrix-types";

export const useCreateSpace = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  return useCallback(
    async (
      createSpaceInfo: CreateSpaceInfo,
    ): Promise<RoomIdentifier | undefined> => {
      try {
        if (matrixClient) {
          return await createZionSpace({ matrixClient, createSpaceInfo });
        } else {
          console.error("Not logged in. Cannot create space");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating space", ex.stack);
      }
      return undefined;
    },
    [matrixClient],
  );
};

export const createZionSpace = async (props: {
  matrixClient: MatrixClient;
  createSpaceInfo: CreateSpaceInfo;
}): Promise<RoomIdentifier> => {
  const { matrixClient, createSpaceInfo } = props;
  const options: ICreateRoomOpts = {
    visibility: createSpaceInfo.visibility,
    name: createSpaceInfo.spaceName,
    is_direct: false,
    creation_content: {
      type: "m.space",
    },
    initial_state: [
      {
        type: "m.room.join_rules",
        state_key: "",
        content: {
          join_rule:
            createSpaceInfo.visibility == Visibility.Public
              ? "public"
              : "invite",
        },
      },
    ],
    power_level_content_override: {
      invite: createSpaceInfo.visibility == Visibility.Public ? 0 : 50,
    },
  };
  const response = await matrixClient.createRoom(options);
  console.log("Created space", options, JSON.stringify(response));
  return makeRoomIdentifier(response.room_id);
};
