import { leaveRoom, setAllRooms, setNewMessage, setRoom, setRoomName, updateMembership, } from "./room_states";
import createStore from "zustand";
export const useStore = createStore((set) => ({
    isAuthenticated: false,
    setIsAuthenticated: (isAuthenticated) => isAuthenticated
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
    setAccessToken: (accessToken) => set({ accessToken: accessToken ?? null }),
    deviceId: null,
    setDeviceId: (deviceId) => set({ deviceId: deviceId ?? null }),
    homeServer: null,
    setHomeServer: (homeServer) => set({ homeServer: homeServer ?? null }),
    rooms: null,
    allMessages: null,
    setNewMessage: (roomId, message) => set((state) => setNewMessage(state, roomId, message)),
    setRoom: (room) => set((state) => setRoom(state, room)),
    setRooms: (rooms) => set((state) => setAllRooms(state, rooms)),
    setRoomName: (roomId, roomName) => set((state) => setRoomName(state, roomId, roomName)),
    leaveRoom: (roomId, userId) => set((state) => leaveRoom(state, roomId, userId)),
    userId: null,
    setUserId: (userId) => set({ userId: userId ?? null }),
    username: null,
    setUsername: (username) => set({ username: username ?? null }),
    updateMembership: (roomId, userId, membership) => set((state) => updateMembership(state, roomId, userId, membership)),
}));
