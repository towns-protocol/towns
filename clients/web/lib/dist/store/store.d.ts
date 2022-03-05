import { Membership, Rooms, RoomsMessages } from "../types/matrix-types";
import { Room as MatrixRoom } from "matrix-js-sdk";
export declare type StoreStates = {
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
    joinRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) => void;
    leaveRoom: (roomId: string, userId: string, isMyRoomMembership: boolean) => void;
    setRoom: (room: MatrixRoom) => void;
    setAllRooms: (rooms: MatrixRoom[]) => void;
    setRoomName: (roomId: string, roomName: string) => void;
    userId: string | null;
    setUserId: (userId: string | undefined) => void;
    username: string | null;
    setUsername: (username: string | undefined) => void;
    updateMembership: (roomId: string, userId: string, membership: Membership, isMyRoomMembership: boolean) => void;
};
export declare const useMatrixStore: import("zustand").UseBoundStore<StoreStates, import("zustand").StoreApi<StoreStates>>;
export declare function setNewMessage(state: StoreStates, roomId: string, message: string): {
    allMessages: {
        [x: string]: string[];
    };
};
