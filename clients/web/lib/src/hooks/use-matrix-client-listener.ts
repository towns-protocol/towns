import {
  CreateClientOption,
  MatrixClient,
  Room,
  createClient,
} from "matrix-js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { Membership } from "../types/matrix-types";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";

enum SyncAction {
  SyncAll = "SyncAll",
  SyncMyRoomMembership = "SyncMyRoomMembership",
}

interface SyncProps {
  roomId: string;
  userId: string;
  membership: Membership;
}

interface SyncRoomInfo {
  action: SyncAction;
  props?: SyncProps;
}

export function useMatrixClientListener(homeServerUrl: string) {
  const {
    homeServer,
    isAuthenticated,
    userId,
    createRoom,
    joinRoom,
    leaveRoom,
    setAllRooms,
    setHomeServer,
    setNewMessage,
    setRoom,
    setRoomName,
    updateMembership,
  } = useMatrixStore();

  const { accessToken } = useCredentialStore();

  const matrixClientRef = useRef<MatrixClient>();
  const [syncInfo, setSyncInfo] = useState<SyncRoomInfo>();

  useEffect(function () {
    setHomeServer(homeServerUrl);
  }, []);

  useEffect(
    function () {
      if (matrixClientRef.current) {
        switch (syncInfo.action) {
          case SyncAction.SyncAll: {
            console.log(`Sync all rooms`);
            const rooms = matrixClientRef.current.getRooms();
            printRooms(rooms);
            setAllRooms(rooms);
            break;
          }
          case SyncAction.SyncMyRoomMembership: {
            const prop = syncInfo.props as SyncProps;
            const room = matrixClientRef.current.getRoom(prop.roomId);
            if (room) {
              setRoom(room);
            }
            updateMembership(
              prop.roomId,
              prop.userId,
              prop.membership,
              prop.userId === matrixClientRef.current.getUserId()
            );
            break;
          }
          default: {
            console.error(`Unsupported ${syncInfo.action}`);
            break;
          }
        }
      }
    },
    [syncInfo]
  );

  const startClient = useCallback(
    async function () {
      if (accessToken && homeServer && userId) {
        const options: CreateClientOption = {
          baseUrl: homeServer,
          accessToken: accessToken,
          userId: userId,
        };
        const client = createClient(options);
        await client.startClient({ initialSyncLimit: 10 });
        matrixClientRef.current = client;

        client.once(
          "sync",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (state: any, prevState: any, res: any) {
            if (state === "PREPARED") {
              setSyncInfo({ action: SyncAction.SyncAll }); // Create a new object to force sync.
            } else {
              console.log(state);
            }
          }
        );

        client.on(
          "Room.timeline",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (event: any, room: any, toStartOfTimeline: any) {
            switch (event.getType()) {
              case "m.room.message": {
                console.log(
                  `Room[${room.roomId}]: ${event.event.content.body}`
                );
                setNewMessage(room.roomId, event.event.content.body);
                break;
              }
              case "m.room.create": {
                console.log(`m.room.create`, { roomId: room.roomId });
                createRoom(room.roomId);
                break;
              }
              case "m.room.name": {
                const roomId = event.getRoomId();
                const name = event.getContent().name;
                console.log(`m.room.name`, {
                  roomId,
                  name,
                });
                setRoomName(roomId, name);
                break;
              }
              case "m.room.member": {
                const roomId = event.getRoomId();
                const userId = event.getStateKey();
                const membership = event.getContent().membership;
                console.log(`m.room.member`, {
                  roomId,
                  userId,
                  membership,
                  content: event.getContent(),
                  event: JSON.stringify(event),
                });

                if (roomId && userId && membership) {
                  updateMembership(
                    roomId,
                    userId,
                    membership,
                    client.getUserId() === userId
                  );
                }
                break;
              }
              default:
                console.log(`Room.timeline event`, event.getType());
                break;
            }
          }
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        client.on("RoomMember.membership", function (event: any, member: any) {
          console.log(`RoomMember.membership event`, {
            eventType: event.getType(),
            userId: member.userId,
            roomId: member.roomId,
            membership: member.membership,
          });
          switch (member.membership) {
            case Membership.Invite: {
              setSyncInfo({
                action: SyncAction.SyncMyRoomMembership,
                props: {
                  roomId: member.roomId,
                  userId: member.userId,
                  membership: member.membership,
                } as SyncProps,
              });
              break;
            }
            case Membership.Join: {
              joinRoom(
                member.roomId,
                member.userId,
                member.userId === client.getUserId()
              );
              break;
            }
            case Membership.Leave: {
              leaveRoom(
                member.roomId,
                member.userId,
                member.userId === client.getUserId()
              );
              break;
            }
            default:
              break;
          }
        });
      }
    },
    [
      accessToken,
      homeServer,
      leaveRoom,
      setNewMessage,
      setRoomName,
      setAllRooms,
      updateMembership,
      userId,
    ]
  );

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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printRooms(rooms: Room[]): void {
  for (const r of rooms) {
    printRoom(r);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printRoom(room: Room): void {
  if (room) {
    console.log(
      `Room[${room.roomId}] = { name: "${
        room.name
      }", membership: ${room.getMyMembership()} }`
    );
  } else {
    console.log(`"room" is undefined. Cannot print.`);
  }
}
