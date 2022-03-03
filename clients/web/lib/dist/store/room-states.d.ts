import { Membership, Room, Rooms } from "../types/matrix-types";
import { Room as MatrixRoom } from "matrix-js-sdk";
import { StoreStates } from "./store";
export declare function createRoom(state: StoreStates, roomId: string): {
    rooms: {
        [x: string]: Room;
    };
};
export declare function setNewMessage(state: StoreStates, roomId: string, message: string): {
    allMessages: {
        [x: string]: string[];
    };
};
export declare function setRoom(state: StoreStates, room: MatrixRoom): {
    rooms: {
        [x: string]: Room;
    };
};
export declare function setAllRooms(state: StoreStates, matrixRooms: MatrixRoom[]): {
    rooms: Rooms;
};
export declare function setRoomName(state: StoreStates, roomId: string, newName: string): StoreStates | {
    rooms: {
        [x: string]: Room;
    };
};
export declare function updateMembership(state: StoreStates, roomId: string, userId: string, membership: Membership, isMyRoomMembership: boolean): StoreStates | {
    rooms: {
        [x: string]: Room;
    };
};
export declare function leaveRoom(state: StoreStates, roomId: string, userId: string, isMyRoomMembership: boolean): StoreStates | {
    rooms: {
        [x: string]: Room;
    };
};
export declare function joinRoom(state: StoreStates, roomId: string, userId: string, isMyRoomMembership: boolean): StoreStates | {
    rooms: {
        [x: string]: Room;
    };
};
