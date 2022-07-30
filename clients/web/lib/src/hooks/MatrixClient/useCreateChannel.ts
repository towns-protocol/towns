import { MatrixContext } from "../../components/MatrixContextProvider";
import {
  HistoryVisibility,
  ICreateRoomOpts,
  ICreateRoomStateEvent,
  MatrixClient,
  Visibility,
} from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import {
  CreateChannelInfo,
  makeRoomIdentifier,
  RoomIdentifier,
  RoomVisibility,
  ZionContext,
} from "../../types/matrix-types";

export const useCreateChannel = () => {
  const { disableEncryption, matrixClient } =
    useContext<ZionContext>(MatrixContext);
  const { homeServer } = useMatrixStore();

  return useCallback(
    async (
      createInfo: CreateChannelInfo,
    ): Promise<RoomIdentifier | undefined> => {
      try {
        if (matrixClient && homeServer) {
          return await createZionChannel({
            matrixClient,
            homeServer,
            createInfo,
            disableEncryption,
          });
        } else {
          console.error("Not logged in. Cannot create room");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating room", ex.stack);
      }
      return undefined;
    },
    [disableEncryption, homeServer, matrixClient],
  );
};

export const createZionChannel = async (props: {
  matrixClient: MatrixClient;
  homeServer: string;
  createInfo: CreateChannelInfo;
  disableEncryption?: boolean;
}): Promise<RoomIdentifier> => {
  const { matrixClient, homeServer, createInfo, disableEncryption } = props;
  // initial state
  const options: ICreateRoomOpts = {
    //room_alias_name: "my_room_alias3",
    visibility: createInfo.visibility as unknown as Visibility,
    name: createInfo.name,
    is_direct: false,
    initial_state: makeInitialState(homeServer, createInfo, disableEncryption),
    room_version: "10",
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

function makeInitialState(
  homeServer: string,
  createInfo: CreateChannelInfo,
  bDisableEncryption?: boolean,
  bRestrictedToParentSpace?: boolean, // todo restricted joins don't work https://github.com/HereNotThere/harmony/issues/197
): ICreateRoomStateEvent[] {
  const initialState: ICreateRoomStateEvent[] = [
    {
      type: "m.room.history_visibility",
      state_key: "",
      content: {
        history_visibility:
          createInfo.historyVisibility ?? HistoryVisibility.Shared,
      },
    },
  ];

  if (bDisableEncryption !== true) {
    initialState.push({
      content: {
        algorithm: "m.megolm.v1.aes-sha2",
        rotation_period_ms: 604800000,
        rotation_period_msgs: 100,
      },
      state_key: "",
      type: "m.room.encryption",
    });
  }

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
