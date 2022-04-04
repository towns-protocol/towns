export declare const LoginTypeWallet = "m.login.wallet";
export declare enum LoginStatus {
    LoggedIn = "LoggedIn",
    LoggingIn = "LoggingIn",
    LoggingOut = "LoggingOut",
    LoggedOut = "LoggedOut",
    Registering = "Registering"
}
export interface AuthenticationError {
    code: number;
    message: string;
}
interface UserInteractiveFlow {
    stages: string[];
}
export interface UserInteractive {
    completed: string[];
    flows: UserInteractiveFlow[];
    params?: any;
    session?: string;
}
interface LoginFlow {
    type: string;
}
export interface LoginFlows {
    flows: LoginFlow[];
}
export interface SignedWalletData {
    signature: string;
    messageFields: WalletMessageFields;
    message: string;
}
export interface AuthenticationData {
    type: string;
    session: string;
    walletAddress: string;
    signedWalletData: SignedWalletData;
}
export interface RegistrationAuthentication {
    type: string;
    session: string;
    walletResponse: AuthenticationData;
}
export interface RegisterRequest {
    auth: RegistrationAuthentication;
    username: string;
    inhibit_login?: boolean;
    device_id?: string;
    initial_device_display_name?: string;
}
export interface WalletMessageFields {
    authority: string;
    address: string;
    statement?: string;
    uri: string;
    version: string;
    chainId: string;
    nonce: string;
    issuedAt: Date;
    expirationTime?: Date;
    notBefore?: Date;
    requestId?: string;
    resources?: string[];
}
export declare function getUsernameFromId(userId: string | undefined): string | undefined;
export declare function toLowerCaseUsername(userId: string): string;
export declare function getShortUsername(userId: string): string;
export declare function isLoginFlow(o: any): o is UserInteractive;
export declare function supportsWalletLoginFlow(loginFlows: UserInteractive): boolean;
export {};
