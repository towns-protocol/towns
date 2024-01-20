export interface AuthenticationError {
    code: number
    message: string
    error?: Error
}

export enum LoginStatus {
    LoggedIn = 'LoggedIn',
    LoggingIn = 'LoggingIn',
    LoggingOut = 'LoggingOut',
    LoggedOut = 'LoggedOut',
    Registering = 'Registering',
}
