export const LoginTypePublicKey = 'm.login.publickey'
export const LoginTypePublicKeyEthereum = 'm.login.publickey.ethereum'

export enum LoginStatus {
    LoggedIn = 'LoggedIn',
    LoggingIn = 'LoggingIn',
    LoggingOut = 'LoggingOut',
    LoggedOut = 'LoggedOut',
    Registering = 'Registering',
}

export interface AuthenticationError {
    code: number
    message: string
    error?: Error
}

interface UserInteractiveFlow {
    stages: string[]
}

export interface PublicKeyEtheremParams {
    version: number
    chain_ids: number[]
}

export interface PublicKeyEtheremParamsV2 {
    version: number
    chain_id: number
}

export interface LoginFlows {
    flows: LoginFlow[]
}
export interface AuthenticationData {
    type: string
    user_id: string
    session: string
    message: string
    signature: string
    device_id?: string
}

export interface RegistrationAuthentication {
    type: string
    session: string
    public_key_response: AuthenticationData
}

export interface RegisterRequest {
    // https://spec.matrix.org/v1.2/client-server-api/#post_matrixclientv3register
    auth: RegistrationAuthentication
    username: string // wallet address
    inhibit_login?: boolean
    device_id?: string
    initial_device_display_name?: string
}

export interface LoginServerResponse {
    accessToken: string | undefined
    userId: string | undefined
    deviceId: string | undefined
    error?: string
}

interface UserInteractive {
    completed: string[]
    flows: UserInteractiveFlow[]
    session: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    params?: any
}

interface LoginFlow {
    type: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isLoginFlowPublicKeyEthereum(o: any): o is UserInteractive {
    if ((o as UserInteractive).flows !== undefined) {
        const flows = (o as UserInteractive).flows
        for (const f of flows) {
            if (f.stages.includes(LoginTypePublicKeyEthereum)) {
                return true
            }
        }
    }

    return false
}

export function getParamsPublicKeyEthereum(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p: any,
): PublicKeyEtheremParams | PublicKeyEtheremParamsV2 | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const params = p[LoginTypePublicKeyEthereum]
    if (params !== undefined) {
        if (isPublicKeyEtheremParamsV2(params)) {
            return params
        } else if (isPublicKeyEtheremParams(params)) {
            return params
        }
    }
    return undefined
}

export function isPublicKeyEtheremParams(params: unknown): params is PublicKeyEtheremParams {
    return (
        (params as PublicKeyEtheremParams).version !== undefined &&
        (params as PublicKeyEtheremParams).chain_ids !== undefined
    )
}

export function isPublicKeyEtheremParamsV2(params: unknown): params is PublicKeyEtheremParamsV2 {
    return (
        (params as PublicKeyEtheremParamsV2).version !== undefined &&
        (params as PublicKeyEtheremParamsV2).chain_id !== undefined
    )
}
