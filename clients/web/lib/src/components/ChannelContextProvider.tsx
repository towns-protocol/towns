import React, { createContext, useContext, useMemo } from "react";
import {
  makeRoomIdentifierFromSlug,
  RoomIdentifier,
} from "../types/matrix-types";
import { Room as MatrixRoom } from "matrix-js-sdk";
import { useSpaceId } from "../hooks/use-space-id";
import { useZionContext } from "./ZionContextProvider";

export interface IChannelContext {
  channelId: RoomIdentifier;
  spaceId: RoomIdentifier;
  channelRoom?: MatrixRoom;
}

export const ChannelContext = createContext<IChannelContext | undefined>(
  undefined,
);

/**
 * use instead of React.useContext
 * and will throw assert if not in a Provider
 */
export function useChannelContext(): IChannelContext {
  const context = useContext(ChannelContext);
  if (!context) {
    throw new Error(
      "useChannelContext must be used in a ChannelContextProvider",
    );
  }
  return context;
}

interface Props {
  channelId: RoomIdentifier | string;
  children: JSX.Element;
}

export function ChannelContextProvider(props: Props): JSX.Element {
  console.log("~~~~~ Channel Context ~~~~~~", props.channelId);
  const { client } = useZionContext();
  const spaceId = useSpaceId();
  if (!spaceId) {
    throw new Error("ChannelContextProvider: no spaceId");
  }
  // convert the room identifier
  const channelId: RoomIdentifier = useMemo(() => {
    if (typeof props.channelId === "string") {
      return makeRoomIdentifierFromSlug(props.channelId);
    }
    return props.channelId;
  }, [props.channelId]);

  const channelRoom = client?.getRoom(channelId);

  const channelContext: IChannelContext = useMemo(
    () => ({
      channelId: channelId,
      spaceId: spaceId,
      channelRoom: channelRoom,
    }),
    [channelId, spaceId, channelRoom],
  );
  return (
    <ChannelContext.Provider value={channelContext}>
      {props.children}
    </ChannelContext.Provider>
  );
}
