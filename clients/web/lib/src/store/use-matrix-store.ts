import { AuthenticationError, LoginStatus } from "../hooks/login";
import {
  makeRoomIdentifier,
  Members,
  Membership,
  Room,
  RoomIdentifier,
  RoomMessage,
  Rooms,
  RoomsMessages,
  SpaceChild,
  SpaceHierarchy,
  SpaceHierarcies,
} from "../types/matrix-types";
import createStore, { SetState } from "zustand";

import { Room as MatrixRoom } from "matrix-js-sdk";
import { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";

export type MatrixStoreStates = {
  createRoom: (roomId: RoomIdentifier, isSpace: boolean) => void;
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
  setNewMessage: (roomId: RoomIdentifier, message: RoomMessage) => void;
  powerLevels: { [roomId: string]: Record<string, unknown> };
  setPowerLevels: (
    roomId: RoomIdentifier,
    powerLevels: Record<string, unknown>,
  ) => void;
  rooms: Rooms | null;
  joinRoom: (
    roomId: RoomIdentifier,
    userId: string,
    isMyRoomMembership: boolean,
  ) => void;
  leaveRoom: (
    roomId: RoomIdentifier,
    userId: string,
    isMyRoomMembership: boolean,
  ) => void;
  setRoom: (room: MatrixRoom) => void;
  setAllRooms: (rooms: MatrixRoom[]) => void;
  setRoomName: (roomId: RoomIdentifier, roomName: string) => void;
  spaceHierarchies: SpaceHierarcies;
  setSpace: (
    spaceId: RoomIdentifier,
    root: IHierarchyRoom,
    children: IHierarchyRoom[],
  ) => SpaceHierarchy;
  createSpaceChild: (spaceId: RoomIdentifier, roomId: RoomIdentifier) => void;
  userId: string | null;
  setUserId: (userId: string | undefined) => void;
  username: string | null;
  setUsername: (username: string | undefined) => void;
  updateMembership: (
    roomId: RoomIdentifier,
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
    powerLevels: {},
    setPowerLevels: (
      roomId: RoomIdentifier,
      powerLevels: Record<string, unknown>,
    ) =>
      set((state: MatrixStoreStates) =>
        setPowerLevels(state, roomId, powerLevels),
      ),

    createRoom: (roomId: RoomIdentifier, isSpace: boolean) =>
      set((state: MatrixStoreStates) => createRoom(state, roomId, isSpace)),
    setNewMessage: (roomId: RoomIdentifier, message: RoomMessage) =>
      set((state: MatrixStoreStates) => setNewMessage(state, roomId, message)),
    setRoom: (room: MatrixRoom) =>
      set((state: MatrixStoreStates) => setRoom(state, room)),
    setAllRooms: (rooms: MatrixRoom[]) =>
      set((state: MatrixStoreStates) => setAllRooms(state, rooms)),
    setRoomName: (roomId: RoomIdentifier, roomName: string) =>
      set((state: MatrixStoreStates) => setRoomName(state, roomId, roomName)),
    spaceHierarchies: {},
    setSpace: (
      spaceId: RoomIdentifier,
      root: IHierarchyRoom,
      children: IHierarchyRoom[],
    ) => {
      const spaceHierarchy = {
        root: toZionSpaceChild(root),
        children: children.map((r) => toZionSpaceChild(r)),
      };
      set((state: MatrixStoreStates) =>
        setSpace(state, spaceId, spaceHierarchy),
      );
      return spaceHierarchy;
    },
    createSpaceChild: (spaceId: RoomIdentifier, roomId: RoomIdentifier) =>
      set((state: MatrixStoreStates) =>
        createSpaceChild(state, spaceId, roomId),
      ),
    joinRoom: (
      roomId: RoomIdentifier,
      userId: string,
      isMyRoomMembership: boolean,
    ) =>
      set((state: MatrixStoreStates) =>
        joinRoom(state, roomId, userId, isMyRoomMembership),
      ),
    leaveRoom: (
      roomId: RoomIdentifier,
      userId: string,
      isMyRoomMembership: boolean,
    ) =>
      set((state: MatrixStoreStates) =>
        leaveRoom(state, roomId, userId, isMyRoomMembership),
      ),
    userId: null,
    setUserId: (userId: string | undefined) => set({ userId: userId ?? null }),
    username: null,
    setUsername: (username: string | undefined) =>
      set({ username: username ?? null }),
    updateMembership: (
      roomId: RoomIdentifier,
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
  roomId: RoomIdentifier,
  isSpace: boolean,
) {
  const changedRooms = { ...state.rooms };
  if (changedRooms[roomId.slug] != null) {
    return { rooms: changedRooms };
  }
  const newRoom: Room = {
    id: roomId,
    name: "",
    membership: "",
    members: {},
    isSpaceRoom: isSpace,
  };
  changedRooms[roomId.slug] = newRoom;
  return { rooms: changedRooms };
}

function setPowerLevels(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  powerLevels: Record<string, unknown>,
) {
  const changedPowerLevels = { ...state.powerLevels };
  changedPowerLevels[roomId.slug] = powerLevels;
  return { powerLevels: changedPowerLevels };
}

function setNewMessage(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  message: RoomMessage,
) {
  const changedAllMessages = state.allMessages ? { ...state.allMessages } : {};
  const changedRoomMessages = changedAllMessages[roomId.slug]
    ? [...changedAllMessages[roomId.slug]]
    : [];
  if (!changedRoomMessages.some((m) => m.eventId === message.eventId)) {
    changedRoomMessages.push(message);
  }
  changedAllMessages[roomId.slug] = changedRoomMessages;
  return { allMessages: changedAllMessages };
}

function setRoom(state: MatrixStoreStates, room: MatrixRoom) {
  const changedRooms = { ...state.rooms };
  const changedRoom: Room = toZionRoom(room);
  changedRooms[changedRoom.id.slug] = changedRoom;
  console.log(`setRoom changedRooms`, {
    roomId: changedRoom.id.matrixRoomId,
    name: changedRoom.name,
    membership: changedRoom.membership,
  });
  return { rooms: changedRooms };
}

function setSpace(
  state: MatrixStoreStates,
  spaceId: RoomIdentifier,
  newSpace: SpaceHierarchy,
) {
  const changedSpaces = { ...state.spaceHierarchies };
  changedSpaces[spaceId.slug] = newSpace;
  return { spaceHierarchies: changedSpaces };
}

function createSpaceChild(
  state: MatrixStoreStates,
  spaceId: RoomIdentifier,
  roomId: RoomIdentifier,
) {
  const room = state.rooms?.[roomId.slug];
  const space = state.spaceHierarchies?.[spaceId.slug];
  if (!room || !space) {
    return state;
  }
  if (space.children.find((c) => c.id.matrixRoomId === roomId.matrixRoomId)) {
    console.log("createSpaceChild: no op");
    return state;
  }
  space.children.push(toZionSpaceChildFromRoom(room));
  const changedSpaces = { ...state.spaceHierarchies };
  changedSpaces[spaceId.slug] = space;
  return { spaceHierarchies: changedSpaces };
}

function setAllRooms(state: MatrixStoreStates, matrixRooms: MatrixRoom[]) {
  const changedRooms = { ...state.rooms };
  for (const r of matrixRooms) {
    const changedRoom = toZionRoom(r);
    changedRooms[changedRoom.id.slug] = changedRoom;
  }
  return { rooms: changedRooms };
}

function setRoomName(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  newName: string,
) {
  const room = state.rooms?.[roomId.slug];
  if (room && room.name !== newName) {
    const changedRoom = { ...room };
    changedRoom.name = newName;
    const changedRooms = { ...state.rooms };
    changedRooms[roomId.slug] = changedRoom;
    //console.log(`setRoomName ${JSON.stringify(changedRoom)}`);
    return { rooms: changedRooms };
  }
  console.log(`setRoomName no op`);
  return state;
}

function updateMembership(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  userId: string,
  membership: Membership,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId.slug];
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
      changedRooms[roomId.slug] = changedRoom;
      console.log(`updateMembership ${JSON.stringify(changedRoom)}`);
      return { rooms: changedRooms };
    }
  }
  console.log(`updateMembership no op`);
  return state;
}

function leaveRoom(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  userId: string,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId.slug];
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
      changedRooms[roomId.slug] = changedRoom;
      return { rooms: changedRooms };
    }
  }
  console.log(`leaveRoom no op`);
  return state;
}

function joinRoom(
  state: MatrixStoreStates,
  roomId: RoomIdentifier,
  userId: string,
  isMyRoomMembership: boolean,
) {
  const room = state.rooms?.[roomId.slug];
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
      changedRooms[roomId.slug] = changedRoom;
      return { rooms: changedRooms };
    }
  }
  console.log(`joinRoom no op`);
  return state;
}

function toZionRoom(r: MatrixRoom): Room {
  return {
    id: makeRoomIdentifier(r.roomId),
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
    id: makeRoomIdentifier(r.room_id),
    name: r.name ?? "Unknown",
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
    id: r.id,
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
