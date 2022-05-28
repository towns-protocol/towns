import { AuthenticationError, LoginStatus } from "../hooks/login";
import { Membership, Room, Rooms, RoomsMessages } from "../types/matrix-types";
import createStore, { SetState } from "zustand";

import { Room as MatrixRoom } from "matrix-js-sdk";

export type MatrixStoreStates = {
  createRoom: (roomId: string) => void;
  isAuthenticated: boolean;
  deviceId: string | null;
  setDeviceId: (deviceId: string | undefined) => void;
  homeServer: string | null;
  setHomeServer: (homeServer: string | undefined) => void;
  loginStatus: LoginStatus;
  setLoginStatus: (loginStatus: LoginStatus) => void;
  loginError: AuthenticationError;
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
    createRoom: (roomId: string) =>
      set((state: MatrixStoreStates) => createRoom(state, roomId)),
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

function createRoom(state: MatrixStoreStates, roomId: string) {
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

function setAllRooms(state: MatrixStoreStates, matrixRooms: MatrixRoom[]) {
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
      isSpaceRoom: r.isSpaceRoom(),
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
    const member = room.members[userId] ?? { membership: null as Membership };
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
