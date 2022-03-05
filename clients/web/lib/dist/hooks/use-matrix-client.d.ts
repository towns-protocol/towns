import { CreateRoomInfo } from "../types/matrix-types";
interface LoginResult {
    accessToken: string | undefined;
    userId: string | undefined;
    homeServer: string | undefined;
    deviceId: string | undefined;
    error?: string;
}
export declare function useMatrixClient(): {
    createRoom: (createInfo: CreateRoomInfo) => Promise<string | undefined>;
    inviteUser: (roomId: string, userId: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;
    loginWithPassword: (username: string, password: string) => Promise<LoginResult>;
    logout: () => Promise<void>;
    registerNewUser: (username: string, password: string) => Promise<LoginResult>;
    sendMessage: (roomId: string, message: string) => Promise<void>;
    syncRoom: (roomId: string) => Promise<void>;
};
export {};
