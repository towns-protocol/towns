import { Membership, Rooms, RoomsMessages } from "../types/matrix_types";
import {
  leaveRoom,
  setAllRooms,
  setNewMessage,
  setRoom,
  setRoomName,
  updateMembership,
} from "./room_states";

import { Room as MatrixRoom } from "matrix-js-sdk";
import createStore, { SetState } from "zustand";

export type StoreStates = {
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
  leaveRoom: (roomId: string, userId: string) => void;
  setRoom: (room: MatrixRoom) => void;
  setRooms: (rooms: MatrixRoom[]) => void;
  setRoomName: (roomId: string, roomName: string) => void;
  userId: string | null;
  setUserId: (userId: string | undefined) => void;
  username: string | null;
  setUsername: (username: string | undefined) => void;
  updateMembership: (
    roomId: string,
    userId: string,
    membership: Membership
  ) => void;
};

export const useStore = createStore<StoreStates>(
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
    setNewMessage: (roomId: string, message: string) =>
      set((state: StoreStates) => setNewMessage(state, roomId, message)),
    setRoom: (room: MatrixRoom) =>
      set((state: StoreStates) => setRoom(state, room)),
    setRooms: (rooms: MatrixRoom[]) =>
      set((state: StoreStates) => setAllRooms(state, rooms)),
    setRoomName: (roomId: string, roomName: string) =>
      set((state: StoreStates) => setRoomName(state, roomId, roomName)),
    leaveRoom: (roomId: string, userId: string) =>
      set((state: StoreStates) => leaveRoom(state, roomId, userId)),
    userId: null,
    setUserId: (userId: string | undefined) => set({ userId: userId ?? null }),
    username: null,
    setUsername: (username: string | undefined) =>
      set({ username: username ?? null }),
    updateMembership: (
      roomId: string,
      userId: string,
      membership: Membership
    ) =>
      set((state: StoreStates) =>
        updateMembership(state, roomId, userId, membership)
      ),
  })
);
