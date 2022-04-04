import { CreateRoomInfo } from "../types/matrix-types";
/**
 * Matrix client API to interact with the Matrix server.
 */
export declare function useMatrixClient(): {
    createRoom: (createInfo: CreateRoomInfo) => Promise<string | undefined>;
    getIsWalletIdRegistered: () => Promise<boolean>;
    inviteUser: (roomId: string, userId: string) => Promise<void>;
    joinRoom: (roomId: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;
    loginWithPassword: (username: string, password: string) => Promise<void>;
    loginWithWallet: (statementToSign: string) => Promise<void>;
    logout: () => Promise<void>;
    registerNewUser: (username: string, password: string) => Promise<void>;
    registerWallet: (statementToSign: string) => Promise<void>;
    sendMessage: (roomId: string, message: string) => Promise<void>;
    syncRoom: (roomId: string) => Promise<void>;
};
