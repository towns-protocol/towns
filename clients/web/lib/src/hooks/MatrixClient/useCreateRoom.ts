import { MatrixContext } from "../../components/MatrixContextProvider";
import { ICreateRoomOpts, MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import {
  CreateRoomInfo,
  makeRoomIdentifier,
  RoomIdentifier,
  Visibility,
  ZionContext,
} from "../../types/matrix-types";

export const useCreateRoom = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  const { homeServer } = useMatrixStore();

  return useCallback(
    async (createInfo: CreateRoomInfo): Promise<RoomIdentifier | undefined> => {
      try {
        if (matrixClient && homeServer) {
          return await createZionRoom({ matrixClient, homeServer, createInfo });
        } else {
          console.error("Not logged in. Cannot create room");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating room", ex.stack);
      }
      return undefined;
    },
    [homeServer, matrixClient],
  );
};

export const createZionRoom = async (props: {
  matrixClient: MatrixClient;
  homeServer: string;
  createInfo: CreateRoomInfo;
}): Promise<RoomIdentifier> => {
  const { matrixClient, homeServer, createInfo } = props;
  // initial state
  const options: ICreateRoomOpts = {
    //room_alias_name: "my_room_alias3",
    visibility: createInfo.visibility,
    name: createInfo.roomName,
    is_direct: createInfo.isDirectMessage === true,
    initial_state: [
      {
        type: "m.room.join_rules",
        state_key: "",
        content: {
          join_rule:
            createInfo.visibility == Visibility.Public ? "public" : "private",
        },
      },
    ],
  };
  // add our parent room if we have one
  if (createInfo.parentSpaceId) {
    if (!options.initial_state) {
      options.initial_state = [];
    }
    options.initial_state.push({
      type: "m.space.parent",
      state_key: createInfo.parentSpaceId.matrixRoomId,
      content: {
        canonical: true,
        via: [homeServer],
      },
    });
  }
  const response = await matrixClient.createRoom(options);
  console.log("Created room", JSON.stringify(response));
  if (createInfo.parentSpaceId) {
    await matrixClient.sendStateEvent(
      createInfo.parentSpaceId.matrixRoomId,
      "m.space.child",
      {
        auto_join: false,
        suggested: false,
        via: [homeServer],
      },
      response.room_id,
    );
  }

  return makeRoomIdentifier(response.room_id);
};
