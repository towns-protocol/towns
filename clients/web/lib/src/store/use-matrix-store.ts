import { AuthenticationError, LoginStatus } from "../hooks/login";
import {
  Members,
  Membership,
  Room,
  Rooms,
  RoomsMessages,
  Space,
  SpaceChild,
} from "../types/matrix-types";
import createStore, { SetState } from "zustand";

import { Room as MatrixRoom } from "matrix-js-sdk";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";

export type MatrixStoreStates = {
  createRoom: (roomId: string, isSpace: boolean) => void;
  isAuthenticated: boolean;
  deviceId: string | null;
  setDeviceId: (deviceId: string | undefined) => void;
  homeServer: string | null;
  setHomeServer: (homeServer: string | undefined) => void;
  loginStatus: LoginStatus;
  setLoginStatus: (loginStatus: LoginStatus) => void;
  loginError: AuthenticationError | null;
  setLoginError: (error: AuthenticationError | undefined) => void;
  allMessages: RoomsMessages | null;
  setNewMessage: (roomId: string, sender: string, message: string) => void;
  rooms: Rooms | null;
  joinRoom: (
    roomId: string,
    userId: string,
    isMyRoomMembership: boolean,
  ) => void;
  leaveRoom: (
    roomId: string,
    userId: string,
    isMyRoomMembership: boolean,
  ) => void;
  setRoom: (room: MatrixRoom) => void;
  setAllRooms: (rooms: MatrixRoom[]) => void;
  setRoomName: (roomId: string, roomName: string) => void;
  spaces: { [spaceId: string]: Space };
  setSpace: (spaceRoom: MatrixRoom, roomHierarchy: RoomHierarchy) => Space;
  createSpaceChild: (spaceId: string, roomId: string) => void;
  userId: string | null;
  setUserId: (userId: string | undefined) => void;
  username: string | null;
  setUsername: (username: string | undefined) => void;
  updateMembership: (
    roomId: string,
    userId: string,
    membership: Membership,
    isMyRoomMembership: boolean,
  ) => void;
};

export const useMatrixStore = createStore<MatrixStoreStates>(
  (set: SetState<MatrixStoreStates>) => ({
    isAuthenticated: false,
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) =>
      loginStatus === LoginStatus.LoggedOut
        ? set({
            allMessages: null,
            isAuthenticated: false,
            deviceId: null,
            loginStatus,
            rooms: null,
            userId: null,
            username: null,
          })
        : loginStatus === LoginStatus.LoggingIn
        ? set({
            isAuthenticated: false,
            loginError: null,
            loginStatus,
          })
        : set({
            isAuthenticated: loginStatus === LoginStatus.LoggedIn,
            loginStatus,
          }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) =>
      set({ loginError: error ?? null }),
    deviceId: null,
    setDeviceId: (deviceId: string | undefined) =>
      set({ deviceId: deviceId ?? null }),
    homeServer: null,
    setHomeServer: (homeServer: string | undefined) =>
      set({ homeServer: homeServer ?? null }),
    rooms: null,
    allMessages: null,
    createRoom: (roomId: string, isSpace: boolean) =>
      set((state: MatrixStoreStates) => createRoom(state, roomId, isSpace)),
    setNewMessage: (roomId: string, sender: string, message: string) =>
      set((state: MatrixStoreStates) =>
        setNewMessage(state, roomId, sender, message),
      ),
    setRoom: (room: MatrixRoom) =>
      set((state: MatrixStoreStates) => setRoom(state, room)),
    setAllRooms: (rooms: MatrixRoom[]) =>
      set((state: MatrixStoreStates) => setAllRooms(state, rooms)),
    setRoomName: (roomId: string, roomName: string) =>
      set((state: MatrixStoreStates) => setRoomName(state, roomId, roomName)),
    spaces: {},
    setSpace: (spaceRoom: MatrixRoom, roomHierarchy: RoomHierarchy) => {
      const newSpace: Space = {
        id: spaceRoom.roomId,
        name: spaceRoom.name,
        members: toZionMembers(spaceRoom),
        children: roomHierarchy.rooms
          .filter((r) => r.room_id != spaceRoom.roomId)
          .map((r) => toZionSpaceChild(r)),
      };
      set((state: MatrixStoreStates) => setSpace(state, newSpace));
      return newSpace;
    },
    createSpaceChild: (spaceId: string, roomId: string) =>
      set((state: MatrixStoreStates) =>
        createSpaceChild(state, spaceId, roomId),
      ),
    joinRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) =>
      set((state: MatrixStoreStates) =>
        joinRoom(state, roomId, userId, isMyRoomMembership),
      ),
    leaveRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) =>
      set((state: MatrixStoreStates) =>
        leaveRoom(state, roomId, userId, isMyRoomMembership),
      ),
    userId: null,
    setUserId: (userId: string | undefined) => set({ userId: userId ?? null }),
    username: null,
    setUsername: (username: string | undefined) =>
      set({ username: username ?? null }),
    updateMembership: (
      roomId: string,
      userId: string,
      membership: Membership,
      isMyRoomMembership: boolean,
    ) =>
      set((state: MatrixStoreStates) =>
        updateMembership(state, roomId, userId, membership, isMyRoomMembership),
      ),
  }),
);

function createRoom(
  state: MatrixStoreStates,
  roomId: string,
  isSpace: boolean,
) {
  const changedRooms = { ...state.rooms };
  const newRoom: Room = {
    roomId,
    name: "",
    membership: "",
    members: {},
    isSpaceRoom: isSpace,
  };
  changedRooms[roomId] = newRoom;
  return { rooms: changedRooms };
}

function setNewMessage(
  state: MatrixStoreStates,
  roomId: string,
  sender: string,
  message: string,
) {
  const changedAllMessages = state.allMessages ? { ...state.allMessages } : {};
  const changedRoomMessages = changedAllMessages[roomId]
    ? [...changedAllMessages[roomId]]
    : [];
  changedRoomMessages.push({
    sender,
    message,
  });
  changedAllMessages[roomId] = changedRoomMessages;
  return { allMessages: changedAllMessages };
}

function setRoom(state: MatrixStoreStates, room: MatrixRoom) {
  const changedRooms = { ...state.rooms };
  const changedRoom: Room = toZionRoom(room);
  changedRooms[room.roomId] = changedRoom;
  console.log(`setRoom changedRooms`, {
    roomId: changedRoom.roomId,
    name: changedRoom.name,
    membership: changedRoom.membership,
  });
  return { rooms: changedRooms };
}

function setSpace(state: MatrixStoreStates, newSpace: Space) {
  const changedSpaces = { ...state.spaces };
  changedSpaces[newSpace.id] = newSpace;
  return { spaces: changedSpaces };
}

function createSpaceChild(
  state: MatrixStoreStates,
  spaceId: string,
  roomId: string,
) {
  const room = state.rooms?.[roomId];
  const space = state.spaces?.[spaceId];
  if (!room || !space) {
    return state;
  }
  if (space.children.find((c) => c.roomId === roomId)) {
    return state;
  }
  space.children.push(toZionSpaceChildFromRoom(room));
  const changedSpaces = { ...state.spaces };
  changedSpaces[spaceId] = space;
  return { spaces: changedSpaces };
}

function setAllRooms(state: MatrixStoreStates, matrixRooms: MatrixRoom[]) {
  const changedRooms: Rooms = {};
  for (const r of matrixRooms) {
    changedRooms[r.roomId] = toZionRoom(r);
  }
  return { rooms: changedRooms };
}

function setRoomName(
  state: MatrixStoreStates,
  roomId: string,
  newName: string,
) {
  const room = state.rooms?.[roomId];
  if (room && room.name !== newName) {
    const changedRoom = { ...room };
    changedRoom.name = newName;
    const changedRooms = { ...state.rooms };
    changedRooms[roomId] = changedRoom;
    console.log(`setRoomName ${JSON.stringify(changedRoom)}`);
    return { rooms: changedRooms };
  }
  console.log(`setRoomName no op`);
  return state;
}

function updateMembership(
  state: MatrixStoreStates,
  roomId: string,
  userId: string,
  membership: Membership,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId];
  if (room) {
    if (
      room.members[userId] == null ||
      room.members[userId].membership !== membership
    ) {
      const changedRooms = { ...state.rooms };
      const changedRoom = { ...room };
      if (isMyRoomMembership) {
        changedRoom.membership = membership;
      }
      const changedMember = { ...changedRoom.members[userId] };
      changedMember.membership = membership;
      changedRoom.members[userId] = changedMember;
      changedRooms[roomId] = changedRoom;
      console.log(`updateMembership ${JSON.stringify(changedRoom)}`);
      return { rooms: changedRooms };
    }
  }
  console.log(`updateMembership no op`);
  return state;
}

function leaveRoom(
  state: MatrixStoreStates,
  roomId: string,
  userId: string,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId];
  if (room) {
    const member = room.members[userId];
    if (member && member.membership !== Membership.Leave) {
      const changedRooms = { ...state.rooms };
      const changedRoom = { ...room };
      const changedMember = { ...changedRoom.members[userId] };
      changedMember.membership = Membership.Leave;
      if (isMyRoomMembership) {
        changedRoom.membership = Membership.Leave;
      }
      changedRoom.members[userId] = changedMember;
      changedRooms[roomId] = changedRoom;
      return { rooms: changedRooms };
    }
  }
  console.log(`leaveRoom no op`);
  return state;
}

function joinRoom(
  state: MatrixStoreStates,
  roomId: string,
  userId: string,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId];
  if (room) {
    const member = room.members[userId];
    if (member && member.membership !== Membership.Join) {
      const changedRooms = { ...state.rooms };
      const changedRoom = { ...room };
      const changedMember = { ...changedRoom.members[userId] };
      changedMember.membership = Membership.Join;
      if (isMyRoomMembership) {
        changedRoom.membership = Membership.Join;
      }
      changedRoom.members[userId] = changedMember;
      changedRooms[roomId] = changedRoom;
      return { rooms: changedRooms };
    }
  }
  console.log(`joinRoom no op`);
  return state;
}

function toZionRoom(r: MatrixRoom): Room {
  return {
    roomId: r.roomId,
    name: r.name,
    membership: r.getMyMembership(),
    inviter:
      r.getMyMembership() === Membership.Invite ? r.guessDMUserId() : undefined,
    members: toZionMembers(r),
    isSpaceRoom: r.isSpaceRoom(),
  };
}

function toZionMembers(r: MatrixRoom): Members {
  return r.getMembersWithMembership(Membership.Join).reduce((result, x) => {
    result[x.userId] = {
      userId: x.userId,
      name: x.name,
      membership: Membership.Join,
    };
    return result;
  }, {} as Members);
}

function toZionSpaceChild(r: IHierarchyRoom): SpaceChild {
  return {
    roomId: r.room_id,
    name: r.name,
    avatarUrl: r.avatar_url,
    topic: r.topic,
    canonicalAlias: r.canonical_alias,
    aliases: r.aliases,
    worldReadable: r.world_readable,
    guestCanJoin: r.guest_can_join,
    numjoinedMembers: r.num_joined_members,
  };
}

function toZionSpaceChildFromRoom(r: Room): SpaceChild {
  return {
    roomId: r.roomId,
    name: r.name,
    avatarUrl: undefined, // r.avatarUrl,
    topic: undefined, // r.topic,
    canonicalAlias: undefined, // r.canonicalAlias,
    aliases: undefined, // r.aliases,
    worldReadable: true, // r.worldReadable,
    guestCanJoin: true, // r.guestCanJoin,
    numjoinedMembers: Object.keys(r.members).length,
  };
}
