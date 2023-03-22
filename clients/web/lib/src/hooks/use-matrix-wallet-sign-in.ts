import { createClient, IAuthData, MatrixClient, MatrixError } from 'matrix-js-sdk'
import { useCallback, useMemo } from 'react'
import { createUserIdFromEthereumAddress, getUsernameFromId } from '../types/user-identifier'
import {
    AuthenticationData,
    AuthenticationError,
    Eip4361Info,
    getChainName,
    LoginFlows,
    LoginStatus,
    LoginTypePublicKey,
    LoginTypePublicKeyEthereum,
    RegisterRequest,
    RegistrationAuthentication,
} from './login'

import { StatusCodes } from 'http-status-codes'
import { SiweMessage } from 'siwe'
import { Buffer } from 'buffer'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionContext } from '../components/ZionContextProvider'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { newMatrixLoginSession, newMatrixRegisterSession } from './session'

interface SignedAuthenticationData {
    signature: string
    message: string
}

export function useMatrixWalletSignIn() {
    const { loginStatus, setLoginError, setLoginStatus } = useMatrixStore()
    const { homeServerUrl: homeServer } = useZionContext()
    const { setMatrixCredentials } = useCredentialStore()
    const { sign, chain, activeWalletAddress } = useWeb3Context()

    const chainIdEip155 = chain?.id

    const userIdentifier = useMemo(() => {
        if (activeWalletAddress && chainIdEip155) {
            return createUserIdFromEthereumAddress(activeWalletAddress, chainIdEip155)
        }
        return undefined
    }, [chainIdEip155, activeWalletAddress])

    const authenticationError = useCallback(
        function (error: AuthenticationError): void {
            console.error(error.message)
            setLoginStatus(LoginStatus.LoggedOut)
            setLoginError(error)
        },
        [setLoginError, setLoginStatus],
    )

    const authenticationSuccess = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (response: IAuthData, authData: AuthenticationData) {
            const { access_token, device_id, user_id } = response
            if (access_token && device_id && user_id && activeWalletAddress) {
                // set zion_siwe cookie on successful registration
                document.cookie = setZionSiweCookie(authData)
                setMatrixCredentials(homeServer, {
                    accessToken: access_token,
                    deviceId: device_id,
                    userId: user_id,
                    username: getUsernameFromId(user_id),
                    loggedInWalletAddress: activeWalletAddress,
                })
                setLoginStatus(LoginStatus.LoggedIn)
            } else {
                setLoginError({
                    code: StatusCodes.UNAUTHORIZED,
                    message: 'Server did not return access_token, user_id, and / or device_id',
                })
                setLoginStatus(LoginStatus.LoggedOut)
            }
        },
        [activeWalletAddress, homeServer, setLoginError, setLoginStatus, setMatrixCredentials],
    )

    const signMessage = useCallback(
        async function (statement: string): Promise<SignedAuthenticationData | undefined> {
            console.log(`[signMessage] start`)
            if (!userIdentifier) {
                console.log(`[signMessage] no userIdentifier`)
                return undefined
            }
            if (!homeServer) {
                console.log(`[signMessage] undefined homeServer`)
                return undefined
            }
            const messageToSign = createMessageToSign({
                walletAddress: userIdentifier.accountAddress,
                chainId: userIdentifier.chainId,
                homeServer,
                statement,
            })

            // Prompt the user to sign the message.
            const signature = await sign(messageToSign, userIdentifier.accountAddress)

            if (signature) {
                console.log(`[signMessage] succeeded`, {
                    signature,
                    userIdentifier,
                    messageToSign,
                })

                return {
                    signature,
                    message: messageToSign,
                }
            }

            console.log(`[signMessage] end`)
        },
        [homeServer, sign, userIdentifier],
    )

    const getIsWalletRegisteredWithMatrix = useCallback(
        async function (): Promise<boolean> {
            if (homeServer && userIdentifier) {
                const matrixClient = createClient({
                    baseUrl: homeServer,
                    useAuthorizationHeader: true,
                })
                try {
                    // isUsernameAvailable returns true if you can register
                    // a new account for that id.
                    const isAvailable = await matrixClient.isUsernameAvailable(
                        userIdentifier.matrixUserIdLocalpart,
                    )
                    // Not available means the id is registered
                    const isRegistered = isAvailable === false
                    console.log(`[getWalletIdRegistered]`, isRegistered)
                    return isRegistered
                } catch (ex) {
                    console.error(ex)
                }
            }
            // Assumption: if wallet id is not available (free to register), then it is registered.
            console.log(`[getWalletIdRegistered] true`)
            return true
        },
        [homeServer, userIdentifier],
    )

    const createAndSignAuthData = useCallback(
        async function (args: {
            sessionId: string
            statement: string
        }): Promise<AuthenticationData | undefined> {
            try {
                if (!userIdentifier) {
                    console.log(`[createAndSignAuthData] no userIdentifier`)
                    return undefined
                }
                const signedAuthenticationData = await signMessage(args.statement)
                if (!signedAuthenticationData) {
                    console.log(`[createAndSignAuthData] undefined signedAuthenticationData`)
                    return undefined
                }
                const { signature, message } = signedAuthenticationData
                if (signature) {
                    // Send the signed message and auth data to the server.
                    const auth: AuthenticationData = {
                        type: LoginTypePublicKeyEthereum,
                        session: args.sessionId,
                        message,
                        signature,
                        user_id: userIdentifier.matrixUserIdLocalpart,
                    }
                    return auth
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (ex) {
                console.error(ex)
            }
            return undefined
        },
        [signMessage, userIdentifier],
    )

    const registerWalletWithMatrix = useCallback(
        async function (statement: string): Promise<void> {
            console.log(`[registerWalletWithMatrix] start`, { homeServer })
            // Registration of a new wallet is allowed if the user is currently logged out.
            if (loginStatus === LoginStatus.LoggedOut) {
                if (userIdentifier && userIdentifier.chainId && homeServer) {
                    // Signal to the UI that registration is in progress.
                    setLoginStatus(LoginStatus.Registering)

                    const matrixClient = createClient({
                        baseUrl: homeServer,
                        useAuthorizationHeader: true,
                    })
                    try {
                        const { sessionId, chainIds, error } = await newMatrixRegisterSession(
                            matrixClient,
                            userIdentifier.matrixUserIdLocalpart,
                        )
                        if (!error && sessionId && chainIds.includes(userIdentifier.chainId)) {
                            // Prompt the user to sign the message.
                            const authData: AuthenticationData | undefined =
                                await createAndSignAuthData({
                                    sessionId,
                                    statement,
                                })

                            const auth: RegistrationAuthentication | undefined = authData
                                ? {
                                      type: LoginTypePublicKey,
                                      session: sessionId,
                                      public_key_response: authData,
                                  }
                                : undefined

                            if (auth) {
                                // Send the signed message and auth data to the server.
                                try {
                                    const request: RegisterRequest = {
                                        auth,
                                        username: userIdentifier.matrixUserIdLocalpart,
                                    }
                                    console.log(
                                        `[registerWalletWithMatrix] sending registerRequest`,
                                        request,
                                    )

                                    const response = await matrixClient.registerRequest(
                                        request,
                                        LoginTypePublicKey,
                                    )
                                    console.log(
                                        `[registerWalletWithMatrix] received response from registerRequest`,
                                        response,
                                    )

                                    if (response.access_token) {
                                        authenticationSuccess(
                                            response,
                                            authData as AuthenticationData,
                                        )
                                    } else {
                                        authenticationError({
                                            code: StatusCodes.UNAUTHORIZED,
                                            message: `Attempt to register wallet ${
                                                userIdentifier.matrixUserId ?? 'undefined'
                                            } failed!`,
                                        })
                                    }
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                } catch (ex: any) {
                                    const error = ex as MatrixError
                                    console.error(`[registerWalletWithMatrix] error`, {
                                        errcode: error.errcode,
                                        httpStatus: error.httpStatus,
                                        message: error.message,
                                        name: error.name,
                                        data: error.data,
                                    })
                                    authenticationError({
                                        code: error.httpStatus ?? 0,
                                        message: error.message,
                                    })
                                }
                            } else {
                                authenticationError({
                                    code: StatusCodes.UNAUTHORIZED,
                                    message: `Attempt to sign the registration message failed!`,
                                })
                            }
                        } else if (!chainIds.includes(userIdentifier.chainId)) {
                            authenticationError({
                                code: StatusCodes.UNAUTHORIZED,
                                message: `Server does not allow registration for blockchain network ${getChainName(
                                    userIdentifier.chainId,
                                )}`,
                            })
                        } else {
                            authenticationError({
                                code: StatusCodes.UNAUTHORIZED,
                                message: `New registration session failed. Error: ${
                                    error ?? 'undefined'
                                }`,
                            })
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (ex: any) {
                        authenticationError({
                            code: StatusCodes.UNAUTHORIZED,
                            message: `Server error during wallet registration ${
                                (ex as Error)?.message
                            }`,
                        })
                    }
                } else {
                    authenticationError({
                        code: StatusCodes.UNAUTHORIZED,
                        message: `Missing information for wallet registration {
                userIdentifier: ${userIdentifier?.matrixUserId ?? 'undefined'},
                homeServer: ${homeServer ?? 'undefined'},
              }`,
                    })
                }
            }
            console.log(`[registerWalletWithMatrix] end`)
        },
        [
            authenticationError,
            authenticationSuccess,
            createAndSignAuthData,
            homeServer,
            loginStatus,
            setLoginStatus,
            userIdentifier,
        ],
    )

    const loginWithWalletToMatrix = useCallback(
        async function (statement: string): Promise<void> {
            // Login is allowed if the user is currently logged out.
            if (loginStatus === LoginStatus.LoggedOut) {
                if (userIdentifier && userIdentifier.chainId && homeServer) {
                    // Signal to the UI that login is in progress.
                    setLoginStatus(LoginStatus.LoggingIn)

                    const matrixClient = createClient({
                        baseUrl: homeServer,
                        useAuthorizationHeader: true,
                    })
                    try {
                        const isPublicKeySignInSupported = await getPublicKeySignInSupported(
                            matrixClient,
                        )
                        if (isPublicKeySignInSupported) {
                            const { sessionId, chainIds, error } = await newMatrixLoginSession(
                                matrixClient,
                            )

                            if (!error && sessionId && chainIds.includes(userIdentifier.chainId)) {
                                // Prompt the user to sign the message.
                                const auth = await createAndSignAuthData({
                                    sessionId,
                                    statement,
                                })

                                if (auth) {
                                    // Send the signed message and auth data to the server.
                                    try {
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                                        const response = await matrixClient.login(
                                            LoginTypePublicKey,
                                            {
                                                auth,
                                            },
                                        )

                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        if (response.access_token) {
                                            authenticationSuccess(response as IAuthData, auth)
                                        } else {
                                            authenticationError({
                                                code: StatusCodes.UNAUTHORIZED,
                                                message: `Attempt to sign in failed!`,
                                            })
                                        }
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    } catch (ex: any) {
                                        const error = ex as MatrixError
                                        console.error(`[loginWithWalletToMatrix] error`, {
                                            errcode: error.errcode,
                                            httpStatus: error.httpStatus,
                                            message: error.message,
                                            name: error.name,
                                            data: error.data,
                                        })
                                        authenticationError({
                                            code: error.httpStatus ?? 0,
                                            message: error.message,
                                        })
                                    }
                                } else {
                                    authenticationError({
                                        code: StatusCodes.UNAUTHORIZED,
                                        message: `Attempt to sign the login message failed!`,
                                    })
                                }
                            } else if (!chainIds.includes(userIdentifier.chainId)) {
                                authenticationError({
                                    code: StatusCodes.UNAUTHORIZED,
                                    message: `Server does not allow login for blockchain network ${getChainName(
                                        userIdentifier.chainId,
                                    )}`,
                                })
                            } else {
                                authenticationError({
                                    code: StatusCodes.UNAUTHORIZED,
                                    message: `New login session failed. Error: ${
                                        error ?? 'undefined'
                                    }`,
                                })
                            }
                        } else {
                            authenticationError({
                                code: StatusCodes.FORBIDDEN,
                                message: `Server does not support wallet sign in!`,
                            })
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (ex: any) {
                        authenticationError({
                            code: StatusCodes.UNAUTHORIZED,
                            message: `Server error during wallet sign in ${
                                (ex as Error)?.message ?? 'undefined'
                            }`,
                        })
                    }
                } else {
                    authenticationError({
                        code: StatusCodes.UNAUTHORIZED,
                        message: `Missing information for login {
                userIdentifier: ${userIdentifier?.matrixUserId ?? 'undefined'},
                homeServer: ${homeServer ?? 'undefined'},
              }`,
                    })
                }
            }
        },
        [
            authenticationError,
            authenticationSuccess,
            createAndSignAuthData,
            homeServer,
            loginStatus,
            setLoginStatus,
            userIdentifier,
        ],
    )

    return {
        getIsWalletRegisteredWithMatrix,
        loginWithWalletToMatrix,
        registerWalletWithMatrix,
    }
}

async function getPublicKeySignInSupported(client: MatrixClient): Promise<boolean> {
    // Get supported flows from the server.
    // loginFlows return type is wrong. Cast it to the expected type.
    const supportedFlows = (await client.loginFlows()) as unknown as LoginFlows
    console.log(`Supported wallet login flows`, supportedFlows)
    return supportedFlows.flows.some((f) => f.type === LoginTypePublicKey)
}

export function getAuthority(uri: string): string {
    const url = new URL(uri)
    // Bug in siwe-go package on the server. Doesn't recognize port.
    //const authority = url.port ? `${url.hostname}:${url.port}` : url.hostname;
    return url.hostname
}

/**
 * Create a message for signing. See https://eips.ethereum.org/EIPS/eip-4361
 * for message template.
 */
export function createMessageToSign(args: {
    walletAddress: string
    chainId: number
    homeServer: string
    statement: string
}): string {
    // Create the auth metadata for signing.
    const eip4361: Eip4361Info = {
        authority: getAuthority(args.homeServer),
        address: args.walletAddress,
        version: '1',
        chainId: args.chainId,
        statement: args.statement,
    }
    const siweMessage = new SiweMessage({
        domain: eip4361.authority,
        address: eip4361.address,
        statement: eip4361.statement,
        uri: eip4361.authority,
        version: '1',
        chainId: eip4361.chainId,
        nonce: '', // Auto-generate.
    })

    console.log(`[createMessageToSign][SiweMessage]`, siweMessage)

    const messageToSign = siweMessage.prepareMessage()
    console.log(`[createMessageToSign][siweMessage.prepareMessage]`, messageToSign)

    return messageToSign
}

function setZionSiweCookie(auth: AuthenticationData): string {
    const hostname = window.location.hostname
    let domain
    if (hostname.includes('localhost')) {
        domain = 'localhost'
    } else {
        domain = `.${hostname.split('.').slice(-2).join('.')}`
    }
    const cookie = {
        name: 'zion_siwe',
        value: Buffer.from(`${auth.signature}__@@__${auth.message}`).toString('base64'),
        domain,
        path: '/',
        secure: 'true',
        sameSite: 'lax',
    }
    // this doesn't work for onrender.com preview environments, which requires domain to equal hostname
    return `${cookie.name}=${cookie.value}; path=${cookie.path}; secure=${cookie.secure}; sameSite=${cookie.sameSite}; domain=${cookie.domain};`
}
