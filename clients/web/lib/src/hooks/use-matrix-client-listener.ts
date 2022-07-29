import {
  ClientEvent,
  ICreateClientOpts,
  MatrixClient,
  MatrixEvent,
  RoomEvent,
  RoomMember,
  RoomMemberEvent,
  createClient,
  Room,
  MatrixEventEvent,
  UserEvent,
  User,
  EventType,
} from "matrix-js-sdk";
import { useCallback, useEffect, useRef } from "react";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMyProfileUpdatedEventHandler } from "./MatrixClientListener/useMyProfileUpdatedEventHandler";
import { useRoomMembershipEventHandler } from "./MatrixClientListener/useRoomMembershipEventHandler";
import { useRoomTimelineEventHandler } from "./MatrixClientListener/useRoomTimelineEventHandler";
import { useSyncEventHandler } from "./MatrixClientListener/useSyncEventHandler";

export const useMatrixClientListener = (
  homeServerUrl: string,
  disableEncryption?: boolean,
  initialSyncLimit = 20,
) => {
  const { deviceId, homeServer, setHomeServer, isAuthenticated, userId } =
    useMatrixStore();

  const { accessToken } = useCredentialStore();

  const matrixClientRef = useRef<MatrixClient>();

  const handleRoomMembershipEvent =
    useRoomMembershipEventHandler(matrixClientRef);
  const handleRoomTimelineEvent = useRoomTimelineEventHandler(matrixClientRef);
  const handleSync = useSyncEventHandler(matrixClientRef);
  const handleMyProfileUpdated =
    useMyProfileUpdatedEventHandler(matrixClientRef);

  useEffect(() => {
    setHomeServer(homeServerUrl);
  }, [homeServerUrl, setHomeServer]);

  const startClient = useCallback(async () => {
    if (accessToken && homeServer && userId && deviceId) {
      const options: ICreateClientOpts = {
        baseUrl: homeServer,
        accessToken: accessToken,
        userId: userId,
        deviceId: deviceId,
      };
      const client = createClient(options);
      if (disableEncryption !== true) {
        await client.initCrypto();
        client.setGlobalErrorOnUnknownDevices(false);
      }
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
        (
          event: MatrixEvent,
          room: Room,
          toStartOfTimeline: boolean,
          removed: any,
          data: any,
        ) => {
          handleRoomTimelineEvent(
            event,
            room,
            toStartOfTimeline,
            removed,
            data,
          );
        },
      );

      client.on(MatrixEventEvent.Decrypted, (event: MatrixEvent) => {
        console.log(
          "recieved decrypted event",
          event.getType(),
          event.getId(),
          event.getRoomId(),
        );
        const roomId = event.getRoomId();
        if (roomId) {
          const room = client.getRoom(roomId);
          if (room) {
            handleRoomTimelineEvent(event, room, false, false, {});
          }
        }
      });

      client.on(
        RoomMemberEvent.Membership,
        (
          event: MatrixEvent,
          member: RoomMember,
          oldMembership: string | null,
        ) => {
          handleRoomMembershipEvent(event, member, oldMembership);

          if (
            event.getType() === EventType.RoomMember &&
            event.getSender() === userId &&
            event.getStateKey() === userId
          ) {
            handleMyProfileUpdated();
          }
        },
      );

      const currentUser = client.getUser(userId);
      if (currentUser) {
        currentUser.on(
          UserEvent.AvatarUrl,
          (event: MatrixEvent | undefined, user: User) => {
            if (user.userId == userId) {
              handleMyProfileUpdated();
            }
          },
        );

        currentUser.on(
          UserEvent.DisplayName,
          (event: MatrixEvent | undefined, user: User) => {
            if (user.userId == userId) {
              handleMyProfileUpdated();
            }
          },
        );

        // fetch profile info
        const profileInfo = await client.getProfileInfo(userId);
        if (profileInfo.displayname) {
          currentUser.displayName = profileInfo.displayname;
        }
        if (profileInfo.avatar_url) {
          currentUser.avatarUrl = profileInfo.avatar_url;
        }
        handleMyProfileUpdated();
      }
      /* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
    }
  }, [
    accessToken,
    deviceId,
    disableEncryption,
    handleMyProfileUpdated,
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
