export interface AuthenticationError {
    code: number
    message: string
    error?: Error
}

/**
 * LoggedOut => LoggingIn => LoggedIn | Authenticated => LoggingOut | Deauthenticating => LoggedOut
 */
export enum LoginStatus {
    LoggedIn = 'LoggedIn',
    LoggingIn = 'LoggingIn',
    Authenticated = 'Authenticated',
    Deauthenticating = 'Deauthenticating',
    LoggingOut = 'LoggingOut',
    LoggedOut = 'LoggedOut',
}
