import React, { createContext, useContext, useEffect, useMemo } from "react";
import { Room as MatrixRoom } from "matrix-js-sdk";
import { RoomIdentifier, toRoomIdentifier } from "../types/matrix-types";
import { useMyMembership } from "../hooks/use-my-membership";
import { useZionClient } from "../hooks/use-zion-client";
import { useMatrixStore } from "../store/use-matrix-store";
import { useZionContext } from "./ZionContextProvider";

export interface ISpaceContext {
  spaceId?: RoomIdentifier;
  spaceRoom?: MatrixRoom;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
export const SpaceContext = createContext<ISpaceContext | undefined>(undefined);

/**
 * use instead of const { spaceId } = useContext<ISpaceContext>(SpaceContext);
 * and will throw assert if not in a SpaceContextProvider
 */
export function useSpaceContext(): ISpaceContext {
  const spaceContext = useContext<ISpaceContext | undefined>(SpaceContext);
  if (!spaceContext) {
    throw new Error("useSpaceContext must be used in a SpaceContextProvider");
  }
  return spaceContext;
}

interface Props {
  spaceId: RoomIdentifier | string | undefined;
  children: JSX.Element;
}

export function SpaceContextProvider(props: Props): JSX.Element {
  // in a very safe way, memoize all space context parameters
  const { defaultSpaceId, client } = useZionContext();
  const spaceId = useMemo(
    () => (props.spaceId ? toRoomIdentifier(props.spaceId) : defaultSpaceId),
    [props.spaceId, defaultSpaceId],
  );
  console.log("SPAECCONTEXTPROVIDER", props.spaceId, spaceId?.matrixRoomId);
  const spaceContext: ISpaceContext = useMemo(
    () => ({
      spaceId: spaceId,
      spaceRoom: spaceId ? client?.getRoom(spaceId) : undefined,
    }),
    [spaceId, client],
  );

  useSyncSpaceEffect(spaceId);
  return (
    <SpaceContext.Provider value={spaceContext}>
      {props.children}
    </SpaceContext.Provider>
  );
}

function useSyncSpaceEffect(spaceId?: RoomIdentifier) {
  // sync space on mount and on change of spaceId
  const { clientRunning, syncSpace } = useZionClient();
  const { spacesUpdateRecievedAt } = useMatrixStore();
  const myMembership = useMyMembership(spaceId);
  const spaceCacheBuster = useMemo(
    () => (spaceId?.slug ? spacesUpdateRecievedAt[spaceId.slug] : undefined),
    [spaceId?.slug, spacesUpdateRecievedAt],
  );

  useEffect(() => {
    console.log(
      "useSyncSpaceEffect - RUNNING EFFECT",
      spaceId,
      clientRunning,
      syncSpace,
      spaceCacheBuster,
    );
    void (async () => {
      try {
        if (clientRunning && spaceId) {
          console.log(
            "syncing space from use-space with membership, cachebuster",
            myMembership,
            spaceCacheBuster,
          );
          await syncSpace(spaceId);
        }
      } catch (reason: unknown) {
        console.log("SpacesIndex error:", reason);
      }
    })();
  }, [myMembership, spaceId, spaceCacheBuster, clientRunning, syncSpace]);
}
