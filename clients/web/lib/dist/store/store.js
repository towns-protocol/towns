"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMatrixStore = void 0;
const room_states_1 = require("./room-states");
const zustand_1 = require("zustand");
exports.useMatrixStore = (0, zustand_1.default)((set) => ({
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
    setAccessToken: (accessToken) => set({ accessToken: accessToken !== null && accessToken !== void 0 ? accessToken : null }),
    deviceId: null,
    setDeviceId: (deviceId) => set({ deviceId: deviceId !== null && deviceId !== void 0 ? deviceId : null }),
    homeServer: null,
    setHomeServer: (homeServer) => set({ homeServer: homeServer !== null && homeServer !== void 0 ? homeServer : null }),
    rooms: null,
    allMessages: null,
    createRoom: (roomId) => set((state) => (0, room_states_1.createRoom)(state, roomId)),
    setNewMessage: (roomId, message) => set((state) => (0, room_states_1.setNewMessage)(state, roomId, message)),
    setRoom: (room) => set((state) => (0, room_states_1.setRoom)(state, room)),
    setAllRooms: (rooms) => set((state) => (0, room_states_1.setAllRooms)(state, rooms)),
    setRoomName: (roomId, roomName) => set((state) => (0, room_states_1.setRoomName)(state, roomId, roomName)),
    joinRoom: (roomId, userId, isMyRoomMembership) => set((state) => (0, room_states_1.joinRoom)(state, roomId, userId, isMyRoomMembership)),
    leaveRoom: (roomId, userId, isMyRoomMembership) => set((state) => (0, room_states_1.leaveRoom)(state, roomId, userId, isMyRoomMembership)),
    userId: null,
    setUserId: (userId) => set({ userId: userId !== null && userId !== void 0 ? userId : null }),
    username: null,
    setUsername: (username) => set({ username: username !== null && username !== void 0 ? username : null }),
    updateMembership: (roomId, userId, membership, isMyRoomMembership) => set((state) => (0, room_states_1.updateMembership)(state, roomId, userId, membership, isMyRoomMembership)),
}));
