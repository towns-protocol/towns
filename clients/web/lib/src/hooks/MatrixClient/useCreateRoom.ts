import { MatrixContext } from "../../components/MatrixContextProvider";
import {
  ICreateRoomOpts,
  ICreateRoomStateEvent,
  MatrixClient,
  Visibility,
} from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import {
  CreateRoomInfo,
  makeRoomIdentifier,
  RoomIdentifier,
  RoomVisibility,
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
    visibility: createInfo.visibility as unknown as Visibility,
    name: createInfo.roomName,
    is_direct: createInfo.isDirectMessage === true,
    initial_state: getInitialState(homeServer, createInfo),
  };
  // create the room
  const response = await matrixClient.createRoom(options);
  console.log("Created room", JSON.stringify(response));
  if (createInfo.parentSpaceId) {
    try {
      await matrixClient.sendStateEvent(
        createInfo.parentSpaceId.matrixRoomId,
        "m.space.child",
        {
          via: [homeServer],
        },
        response.room_id,
      );
    } catch (ex) {
      console.error("Error sending child room event", ex);
      await matrixClient.leave(response.room_id);
      await matrixClient.forget(response.room_id, true);
      throw ex;
    }
  }

  return makeRoomIdentifier(response.room_id);
};

function getInitialState(
  homeServer: string,
  createInfo: CreateRoomInfo,
  bRestrictedToParentSpace?: boolean, // todo restricted joins don't work https://github.com/HereNotThere/harmony/issues/197
): ICreateRoomStateEvent[] {
  const initialState: ICreateRoomStateEvent[] = [];

  if (createInfo.parentSpaceId) {
    initialState.push({
      type: "m.space.parent",
      state_key: createInfo.parentSpaceId.matrixRoomId,
      content: {
        canonical: true,
        via: [homeServer],
      },
    });
  }

  if (
    createInfo.parentSpaceId &&
    createInfo.visibility == RoomVisibility.Public &&
    bRestrictedToParentSpace
  ) {
    initialState.push({
      type: "m.room.join_rules",
      state_key: "",
      content: {
        join_rule: "restricted",
        allow: [
          {
            room_id: createInfo.parentSpaceId.matrixRoomId,
            type: "m.room_membership",
          },
        ],
      },
    });
  } else {
    initialState.push({
      type: "m.room.join_rules",
      state_key: "",
      content: {
        join_rule:
          createInfo.visibility == RoomVisibility.Public ? "public" : "invite",
      },
    });
  }
  return initialState;
}
