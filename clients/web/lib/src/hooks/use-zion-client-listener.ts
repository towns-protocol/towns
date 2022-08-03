import { ZionClient } from "../client/ZionClient";
import { ZionOpts } from "../client/ZionClientTypes";
import { useCallback, useEffect, useRef } from "react";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useRoomMembershipEventHandler } from "./MatrixClientListener/useRoomMembershipEventHandler";
import { useRoomTimelineEventHandler } from "./MatrixClientListener/useRoomTimelineEventHandler";
import { useSyncEventHandler } from "./MatrixClientListener/useSyncEventHandler";

export const useZionClientListener = (opts: ZionOpts) => {
  const { deviceId, isAuthenticated, userId } = useMatrixStore();
  const { accessToken } = useCredentialStore();

  // for historical reasons we only return the client when it's authed and ready
  const clientRef = useRef<ZionClient>();

  // singleton client for the app
  const clientSingleton = useRef<ZionClient>();
  if (!clientSingleton.current) {
    clientSingleton.current = new ZionClient(opts);
  }

  const handleRoomMembershipEvent = useRoomMembershipEventHandler(clientRef);
  const handleRoomTimelineEvent = useRoomTimelineEventHandler(clientRef);
  const handleSync = useSyncEventHandler(clientRef);

  const startClient = useCallback(async () => {
    if (!accessToken || !userId || !deviceId) {
      console.error(
        "startClient: accessToken, userId, or deviceId is undefined",
      );
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const client = clientSingleton.current!;
    // make sure we're not re-starting the client
    if (client.auth?.accessToken === accessToken) {
      console.warn("startClient: called again with same access token");
      return;
    }
    console.log("******* start client *******");
    await client.startClient(
      { userId, accessToken, deviceId },
      {
        onRoomMembershipEvent: handleRoomMembershipEvent,
        onRoomTimelineEvent: handleRoomTimelineEvent,
      },
    );
    handleSync();
    clientRef.current = client;
    // fetch profile info
    await clientRef.current.getProfileInfo(userId);
    /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  }, [
    accessToken,
    deviceId,
    handleRoomMembershipEvent,
    handleRoomTimelineEvent,
    handleSync,
    userId,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      void (async () => await startClient())();
      console.log(`Matrix client listener started`);
    } else {
      if (clientRef.current) {
        clientRef.current.stopClient();
        clientRef.current = undefined;
        console.log("Matrix client listener stopped");
      }
    }
  }, [isAuthenticated, startClient]);

  return {
    client: clientRef.current,
  };
};
