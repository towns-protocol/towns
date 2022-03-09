import {
  CreateClientOption,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomMember,
  createClient,
} from "matrix-js-sdk";
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Membership } from "../types/matrix-types";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";

interface SyncMembership {
  roomId: string;
  userId: string;
  membership: Membership;
}

export function useMatrixClientListener(
  homeServerUrl: string,
  initialSyncLimit = 20
) {
  const { homeServer, isAuthenticated, userId, setHomeServer } =
    useMatrixStore();

  const { accessToken } = useCredentialStore();

  const matrixClientRef = useRef<MatrixClient>();

  const handleRoomEvent = useRoomEventHandler();
  const handleRoomMembershipEvent =
    useRoomMembershipEventHandler(matrixClientRef);
  const handleRoomTimelineEvent = useRoomTimelineEventHandler(matrixClientRef);
  const handleSync = useSync(matrixClientRef);

  useEffect(function () {
    setHomeServer(homeServerUrl);
  }, []);

  const startClient = useCallback(
    async function () {
      if (accessToken && homeServer && userId) {
        const options: CreateClientOption = {
          baseUrl: homeServer,
          accessToken: accessToken,
          userId: userId,
        };
        const client = createClient(options);
        await client.startClient({ initialSyncLimit });
        matrixClientRef.current = client;

        client.once(
          "sync",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (state: any, prevState: any, res: any) {
            if (state === "PREPARED") {
              handleSync();
            } else {
              console.log(state);
            }
          }
        );

        client.on(
          "Room.timeline",
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          function (event: any, room: any, toStartOfTimeline: any) {
            handleRoomTimelineEvent(event, room, toStartOfTimeline);
          }
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        client.on(
          "RoomMember.membership",
          function (event: MatrixEvent, member: RoomMember) {
            handleRoomMembershipEvent(event, member);
          }
        );

        client.on("Room", function (room: Room) {
          handleRoomEvent(room);
        });
      }
    },
    [accessToken, homeServer, initialSyncLimit, userId]
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

function printRooms(rooms: Room[]): void {
  for (const r of rooms) {
    printRoom(r);
  }
}

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

function useSync(matrixClientRef: MutableRefObject<MatrixClient>) {
  const [syncInfo, setSyncInfo] = useState<unknown>();
  const { setAllRooms } = useMatrixStore();

  useEffect(
    function () {
      if (matrixClientRef.current) {
        console.log(`Sync all rooms`);
        const rooms = matrixClientRef.current.getRooms();
        printRooms(rooms);
        setAllRooms(rooms);
      }
    },
    [syncInfo]
  );

  const handleSyncAll = useCallback(function () {
    // Force a sync by mutating the state.
    setSyncInfo({});
  }, []);

  return handleSyncAll;
}

function useRoomMembershipEventHandler(
  matrixClientRef: MutableRefObject<MatrixClient>
) {
  const { joinRoom, leaveRoom, setRoom, updateMembership } = useMatrixStore();
  const [syncInfo, setSyncInfo] = useState<SyncMembership>();

  useEffect(
    function () {
      if (matrixClientRef.current) {
        const room = matrixClientRef.current.getRoom(syncInfo.roomId);
        if (room) {
          setRoom(room);
        }
        updateMembership(
          syncInfo.roomId,
          syncInfo.userId,
          syncInfo.membership,
          syncInfo.userId === matrixClientRef.current.getUserId()
        );
      }
    },
    [syncInfo]
  );

  const handleRoomMembershipEvent = useCallback(function (
    event: MatrixEvent,
    member: RoomMember
  ) {
    console.log(`RoomMember.membership event`, {
      eventType: event.getType(),
      userId: member.userId,
      roomId: member.roomId,
      membership: member.membership,
    });

    switch (member.membership) {
      case Membership.Invite: {
        setSyncInfo({
          roomId: member.roomId,
          userId: member.userId,
          membership: member.membership as Membership,
        });
        break;
      }
      case Membership.Join: {
        joinRoom(
          member.roomId,
          member.userId,
          member.userId === matrixClientRef.current.getUserId()
        );
        break;
      }
      case Membership.Leave: {
        leaveRoom(
          member.roomId,
          member.userId,
          member.userId === matrixClientRef.current.getUserId()
        );
        break;
      }
      default:
        break;
    }
  },
  []);

  return handleRoomMembershipEvent;
}

function useRoomTimelineEventHandler(
  matrixClientRef: MutableRefObject<MatrixClient>
) {
  const { createRoom, setNewMessage, setRoomName, updateMembership } =
    useMatrixStore();

  const handleRoomeTimelineEvent = useCallback(function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    room: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    toStartOfTimeline: any
  ) {
    switch (event.getType()) {
      case "m.room.message": {
        console.log(`Room[${room.roomId}]: ${event.event.content.body}`);
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
            matrixClientRef.current.getUserId() === userId
          );
        }
        break;
      }
      default:
        console.log(`Room.timeline event`, event.getType());
        break;
    }
  }, []);

  return handleRoomeTimelineEvent;
}

function useRoomEventHandler() {
  const handleRoomEvent = useCallback(function (room: Room) {
    console.log("Room.event", {
      roomId: room.roomId,
      name: room.name,
    });
  }, []);

  return handleRoomEvent;
}
