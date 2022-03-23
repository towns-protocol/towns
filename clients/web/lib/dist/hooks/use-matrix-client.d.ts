import { LoginCompletedResponse } from "./login";
import { CreateRoomInfo } from "../types/matrix-types";
/**
 * Matrix client API to interact with the Matrix server.
 */
export declare function useMatrixClient(): {
    createRoom: (createInfo: CreateRoomInfo) => Promise<string | undefined>;
    inviteUser: (roomId: string, userId: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;
    loginWithPassword: (username: string, password: string) => Promise<LoginCompletedResponse>;
    loginWithWallet: (statementToSign: string) => Promise<LoginCompletedResponse>;
    logout: () => Promise<void>;
    registerNewUser: (username: string, password: string) => Promise<LoginCompletedResponse>;
    sendMessage: (roomId: string, message: string) => Promise<void>;
    syncRoom: (roomId: string) => Promise<void>;
};
