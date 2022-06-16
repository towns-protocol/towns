import {
  ClientEvent,
  ICreateClientOpts,
  MatrixClient,
  MatrixEvent,
  RoomEvent,
  RoomMember,
  RoomMemberEvent,
  createClient,
} from "matrix-js-sdk";
import { useCallback, useEffect, useRef } from "react";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useRoomMembershipEventHandler } from "./MatrixClientListener/useRoomMembershipEventHandler";
import { useRoomTimelineEventHandler } from "./MatrixClientListener/useRoomTimelineEventHandler";
import { useSyncEventHandler } from "./MatrixClientListener/useSyncEventHandler";

export const useMatrixClientListener = (
  homeServerUrl: string,
  initialSyncLimit = 20,
) => {
  const { homeServer, setHomeServer, isAuthenticated, userId } =
    useMatrixStore();

  const { accessToken } = useCredentialStore();

  const matrixClientRef = useRef<MatrixClient>();

  const handleRoomMembershipEvent =
    useRoomMembershipEventHandler(matrixClientRef);
  const handleRoomTimelineEvent = useRoomTimelineEventHandler(matrixClientRef);
  const handleSync = useSyncEventHandler(matrixClientRef);

  useEffect(() => {
    setHomeServer(homeServerUrl);
  }, [homeServerUrl, setHomeServer]);

  const startClient = useCallback(async () => {
    if (accessToken && homeServer && userId) {
      const options: ICreateClientOpts = {
        baseUrl: homeServer,
        accessToken: accessToken,
        userId: userId,
      };
      const client = createClient(options);
      await client.startClient({ initialSyncLimit });
      matrixClientRef.current = client;
      /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
      client.once(ClientEvent.Sync, (state: any, prevState: any, res: any) => {
        if (state === "PREPARED") {
          handleSync();
        } else {
          console.log("Unhandled sync event:", state);
        }
      });

      client.on(
        RoomEvent.Timeline,
        (event: any, room: any, toStartOfTimeline: any) => {
          handleRoomTimelineEvent(event, room, toStartOfTimeline);
        },
      );

      client.on(
        RoomMemberEvent.Membership,
        (event: MatrixEvent, member: RoomMember) => {
          handleRoomMembershipEvent(event, member);
        },
      );
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
    }
  }, [
    accessToken,
    handleRoomMembershipEvent,
    handleRoomTimelineEvent,
    handleSync,
    homeServer,
    initialSyncLimit,
    userId,
  ]);

  useEffect(() => {
    if (isAuthenticated) {
      void (async () => await startClient())();
      console.log(`Matrix client listener started`);
    } else {
      if (matrixClientRef.current) {
        matrixClientRef.current.stopClient();
        matrixClientRef.current = undefined;
        console.log("Matrix client listener stopped");
      }
    }
  }, [isAuthenticated, startClient]);

  return {
    matrixClient: matrixClientRef.current,
  };
};
