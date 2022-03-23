export declare enum LoginStatus {
    LoggedIn = "LoggedIn",
    LoggingIn = "LoggingIn",
    LoggingOut = "LoggingOut",
    LoggedOut = "LoggedOut"
}
export interface LoginCompletedResponse {
    isAuthenticated: boolean;
    error?: string;
}
export declare function getUsernamePart(userId: string | undefined): string | undefined;
