export declare enum LogInStatus {
    LoggedIn = "LoggedIn",
    LoggingIn = "LoggingIn",
    LoggingOut = "LoggingOut",
    LoggedOut = "LoggedOut"
}
export interface LogInCompletedResponse {
    isAuthenticated: boolean;
    error?: string;
}
export declare function getUsernamePart(userId: string | undefined): string | undefined;
