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
import { ZionClientEvent } from "client/ZionClientTypes";

export type MatrixStoreStates = {
  createRoom: (roomId: RoomIdentifier, isSpace: boolean) => void;
  isAuthenticated: boolean;
  deviceId: string | null;
  setDeviceId: (deviceId: string | undefined) => void;
  loginStatus: LoginStatus;
  setLoginStatus: (loginStatus: LoginStatus) => void;
  loginError: AuthenticationError | null;
  setLoginError: (error: AuthenticationError | undefined) => void;
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
  spacesUpdateRecievedAt: { [spaceId: string]: number };
  setSpaceUpdateRecievedAt: (spaceId: RoomIdentifier) => void;
  spaceHierarchies: SpaceHierarcies;
  setSpace: (
    spaceId: RoomIdentifier,
    root: IHierarchyRoom,
    children: IHierarchyRoom[],
  ) => SpaceHierarchy;
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
  zionClientEvents: { [event in ZionClientEvent]?: number };
  triggerZionClientEvent: (event: ZionClientEvent) => void;
};

export const useMatrixStore = createStore<MatrixStoreStates>(
  (set: SetState<MatrixStoreStates>) => ({
    isAuthenticated: false,
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) =>
      loginStatus === LoginStatus.LoggedOut
        ? set({
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
    rooms: null,
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
    setRoom: (room: MatrixRoom) =>
      set((state: MatrixStoreStates) => setRoom(state, room)),
    setAllRooms: (rooms: MatrixRoom[]) =>
      set((state: MatrixStoreStates) => setAllRooms(state, rooms)),
    setRoomName: (roomId: RoomIdentifier, roomName: string) =>
      set((state: MatrixStoreStates) => setRoomName(state, roomId, roomName)),
    spacesUpdateRecievedAt: {},
    setSpaceUpdateRecievedAt: (spaceId: RoomIdentifier) =>
      set((state: MatrixStoreStates) =>
        setSpaceUpdateRecievedAt(state, spaceId),
      ),
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
    zionClientEvents: {},
    triggerZionClientEvent: (event: ZionClientEvent) =>
      set((state: MatrixStoreStates) => triggerZionClientEvent(state, event)),
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

function setSpaceUpdateRecievedAt(
  state: MatrixStoreStates,
  spaceId: RoomIdentifier,
) {
  const changed = { ...state.spacesUpdateRecievedAt };
  changed[spaceId.slug] = Date.now();
  return { spacesUpdateRecievedAt: changed };
}

function triggerZionClientEvent(
  state: MatrixStoreStates,
  event: ZionClientEvent,
) {
  const changed = { ...state.zionClientEvents };
  changed[event] = Date.now();
  return { zionClientEvents: changed };
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
      avatarUrl: x.getMxcAvatarUrl() ?? undefined,
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
