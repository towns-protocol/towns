import { Membership, Room, Rooms, RoomsMessages } from "../types/matrix-types";

import { Room as MatrixRoom } from "matrix-js-sdk";
import createStore, { SetState } from "zustand";

export type StoreStates = {
  createRoom: (roomId: string) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  accessToken: string | null;
  setAccessToken: (accessToken: string | undefined) => void;
  deviceId: string | null;
  setDeviceId: (deviceId: string | undefined) => void;
  homeServer: string | null;
  setHomeServer: (homeServer: string | undefined) => void;
  allMessages: RoomsMessages | null;
  setNewMessage: (roomId: string, message: string) => void;
  rooms: Rooms | null;
  joinRoom: (
    roomId: string,
    userId: string,
    isMyRoomMembership: boolean
  ) => void;
  leaveRoom: (
    roomId: string,
    userId: string,
    isMyRoomMembership: boolean
  ) => void;
  setRoom: (room: MatrixRoom) => void;
  setAllRooms: (rooms: MatrixRoom[]) => void;
  setRoomName: (roomId: string, roomName: string) => void;
  userId: string | null;
  setUserId: (userId: string | undefined) => void;
  username: string | null;
  setUsername: (username: string | undefined) => void;
  updateMembership: (
    roomId: string,
    userId: string,
    membership: Membership,
    isMyRoomMembership: boolean
  ) => void;
};

export const useMatrixStore = createStore<StoreStates>(
  (set: SetState<StoreStates>) => ({
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated: boolean) =>
      isAuthenticated
        ? set({ isAuthenticated: true })
        : set({
            isAuthenticated: false,
            accessToken: null,
            deviceId: null,
            homeServer: null,
            allMessages: null,
            rooms: null,
            userId: null,
            username: null,
          }),
    accessToken: null,
    setAccessToken: (accessToken: string | undefined) =>
      set({ accessToken: accessToken ?? null }),
    deviceId: null,
    setDeviceId: (deviceId: string | undefined) =>
      set({ deviceId: deviceId ?? null }),
    homeServer: null,
    setHomeServer: (homeServer: string | undefined) =>
      set({ homeServer: homeServer ?? null }),
    rooms: null,
    allMessages: null,
    createRoom: (roomId: string) =>
      set((state: StoreStates) => createRoom(state, roomId)),
    setNewMessage: (roomId: string, message: string) =>
      set((state: StoreStates) => setNewMessage(state, roomId, message)),
    setRoom: (room: MatrixRoom) =>
      set((state: StoreStates) => setRoom(state, room)),
    setAllRooms: (rooms: MatrixRoom[]) =>
      set((state: StoreStates) => setAllRooms(state, rooms)),
    setRoomName: (roomId: string, roomName: string) =>
      set((state: StoreStates) => setRoomName(state, roomId, roomName)),
    joinRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) =>
      set((state: StoreStates) =>
        joinRoom(state, roomId, userId, isMyRoomMembership)
      ),
    leaveRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) =>
      set((state: StoreStates) =>
        leaveRoom(state, roomId, userId, isMyRoomMembership)
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
      isMyRoomMembership: boolean
    ) =>
      set((state: StoreStates) =>
        updateMembership(state, roomId, userId, membership, isMyRoomMembership)
      ),
  })
);

function createRoom(state: StoreStates, roomId: string) {
  const changedRooms = { ...state.rooms };
  const newdRoom: Room = {
    roomId,
    name: "",
    membership: null,
    members: {},
  };
  changedRooms[roomId] = newdRoom;
  return { rooms: changedRooms };
}

export function setNewMessage(
  state: StoreStates,
  roomId: string,
  message: string
) {
  const changedAllMessages = state.allMessages ? { ...state.allMessages } : {};
  const changedRoomMessages = changedAllMessages[roomId]
    ? [...changedAllMessages[roomId]]
    : [];
  changedRoomMessages.push(message);
  changedAllMessages[roomId] = changedRoomMessages;
  return { allMessages: changedAllMessages };
}

function setRoom(state: StoreStates, room: MatrixRoom) {
  const changedRooms = { ...state.rooms };
  const changedRoom: Room = {
    roomId: room.roomId,
    name: room.name,
    membership: room.getMyMembership(),
    inviter:
      room.getMyMembership() === Membership.Invite
        ? room.guessDMUserId()
        : undefined,
    members: {},
  };
  const members = room.getMembersWithMembership(Membership.Join);
  for (const m of members) {
    changedRoom.members[m.userId] = {
      userId: m.userId,
      name: m.name,
      membership: Membership.Join,
    };
  }
  changedRooms[room.roomId] = changedRoom;
  console.log(`setRoom changedRooms`, {
    roomId: changedRoom.roomId,
    name: changedRoom.name,
    membership: changedRoom.membership,
  });
  return { rooms: changedRooms };
}

function setAllRooms(state: StoreStates, matrixRooms: MatrixRoom[]) {
  const changedRooms: Rooms = {};
  for (const r of matrixRooms) {
    console.log(`matrixRoom[${r.roomId}]`, { name: r.name });
    changedRooms[r.roomId] = {
      roomId: r.roomId,
      name: r.name,
      membership: r.getMyMembership(),
      inviter:
        r.getMyMembership() === Membership.Invite
          ? r.guessDMUserId()
          : undefined,
      members: {},
    };
    const members = r.getMembersWithMembership(Membership.Join);
    for (const m of members) {
      changedRooms[r.roomId].members[m.userId] = {
        userId: m.userId,
        name: m.name,
        membership: Membership.Join,
      };
    }

    console.log(`setAllRooms changedRooms`, {
      roomId: changedRooms[r.roomId].roomId,
      name: changedRooms[r.roomId].name,
      membership: changedRooms[r.roomId].membership,
    });
  }
  return { rooms: changedRooms };
}

function setRoomName(state: StoreStates, roomId: string, newName: string) {
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
  state: StoreStates,
  roomId: string,
  userId: string,
  membership: Membership,
  isMyRoomMembership: boolean
) {
  const room = state.rooms?.[roomId];
  if (room) {
    const member = room.members[userId] ?? { membership: null };
    if (member.membership !== membership) {
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
  state: StoreStates,
  roomId: string,
  userId: string,
  isMyRoomMembership: boolean
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
  state: StoreStates,
  roomId: string,
  userId: string,
  isMyRoomMembership: boolean
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
