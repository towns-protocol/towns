import { Membership, Rooms, RoomsMessages } from "../types/matrix-types";
import { Room as MatrixRoom } from "matrix-js-sdk";
import { LogInStatus } from "../hooks/login";
export declare type MatrixStoreStates = {
    createRoom: (roomId: string) => void;
    isAuthenticated: boolean;
    deviceId: string | null;
    setDeviceId: (deviceId: string | undefined) => void;
    homeServer: string | null;
    setHomeServer: (homeServer: string | undefined) => void;
    loginStatus: LogInStatus;
    setLogInStatus: (loginStatus: LogInStatus) => void;
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
export declare const useMatrixStore: import("zustand").UseBoundStore<MatrixStoreStates, import("zustand").StoreApi<MatrixStoreStates>>;
export declare function setNewMessage(state: MatrixStoreStates, roomId: string, message: string): {
    allMessages: {
        [x: string]: string[];
    };
};
