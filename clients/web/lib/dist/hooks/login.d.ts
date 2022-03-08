export declare enum LogInStatus {
    LoggedIn = "LoggedIn",
    LoggingIn = "LoggingIn",
    LoggingOut = "LoggingOut",
    LoggedOut = "LoggedOut"
}
interface LoginResult {
    accessToken: string | undefined;
    userId: string | undefined;
    homeServer: string | undefined;
    deviceId: string | undefined;
    error?: string;
}
export declare function getUserNamePart(userId: string | undefined): string | undefined;
export declare function matrixRegisterUser(homeServerUrl: string, username: string, password: string): Promise<LoginResult>;
export declare function matrixLoginWithPassword(homeServerUrl: string, username: string, password: string): Promise<LoginResult>;
export {};
