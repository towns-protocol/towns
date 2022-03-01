import { CreateClientOption, MatrixClient, createClient } from "matrix-js-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import { Membership, Rooms } from "../types/matrix_types";
import { useStore } from "../store/store";

export function useMatrixClientListener() {
  const {
    accessToken,
    homeServer,
    isAuthenticated,
    userId,
    leaveRoom,
    setNewMessage,
    setRoom,
    setRoomName,
    setRooms,
    updateMembership,
  } = useStore();
  const matrixClientRef = useRef<MatrixClient>();

  const [syncRoomId, setSyncRoomId] = useState<string>("");
  const [membershipChanged, setMembershipChanged] = useState<string>("");

  useEffect(
    function () {
      if (matrixClientRef.current) {
        const room = matrixClientRef.current.getRoom(syncRoomId);
        if (room) {
          console.log(`Listener: sync room`, {
            roomId: room.roomId,
            name: room.name,
            membership: room.getMyMembership(),
          });
          setRoom(room);
        } else {
          console.log(`Listener: cannot sync room ${syncRoomId}`);
        }
      }
    },
    [syncRoomId, membershipChanged, setRoom]
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

        client.once(
          "sync",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          async function (state: any, prevState: any, res: any) {
            if (state === "PREPARED") {
              const matrixRooms = client.getRooms();
              setRooms(matrixRooms);
              //printRooms(newRooms);
            } else {
              console.log(state);
            }
          }
        );

        client.on(
          "Room.timeline",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          async function (event: any, room: any, toStartOfTimeline: any) {
            switch (event.getType()) {
              case "m.room.message": {
                setNewMessage(room.roomId, event.event.content.body);
                console.log(
                  `Room[${room.roomId}]: ${event.event.content.body}`
                );
                break;
              }
              case "m.room.create": {
                console.log(`m.room.create`, { roomId: room.roomId });
                setSyncRoomId(room.roomId);
                break;
              }
              case "m.room.name": {
                console.log(`m.room.name`, {
                  roomId: event.getRoomId(),
                  name: event.getContent().name,
                });
                setRoomName(event.getRoomId(), event.getContent().name);
                break;
              }
              case "m.room.member": {
                console.log(`m.room.member`, {
                  roomId: event.getRoomId(),
                  content: event.getContent(),
                });
                setSyncRoomId(event.getRoomId());

                const membership = event.getContent().membership;
                if (membership) {
                  setMembershipChanged(membership);
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
          switch (member.membership) {
            case Membership.Invite: {
              if (member.userId === client.getUserId()) {
                updateMembership(
                  member.roomId,
                  member.userId,
                  Membership.Invite
                );
              }
              break;
            }
            case Membership.Join: {
              setSyncRoomId(member.roomId);
              break;
            }
            case Membership.Leave: {
              if (member.userId === client.getUserId()) {
                leaveRoom(member.roomId, member.userId);
              }
              break;
            }
            default: {
              console.log(`RoomMember.membership event`, {
                eventType: event.getType(),
                userId: member.userId,
                roomId: member.roomId,
                membership: member.membership,
              });
              break;
            }
          }
        });

        matrixClientRef.current = client;
      }
    },
    [
      accessToken,
      homeServer,
      leaveRoom,
      setNewMessage,
      setRoomName,
      setRooms,
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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function printRooms(rooms: Rooms): void {
  let i = 0;
  for (const r of Object.values(rooms)) {
    console.log(
      `Room[${i++}] = { roomId: ${r.roomId}, name: "${r.name}", membership: ${
        r.membership
      } }`
    );
  }
}
