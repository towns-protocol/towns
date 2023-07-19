import { createClient, IAuthData, MatrixClient, MatrixError } from 'matrix-js-sdk'
import { useCallback, useMemo } from 'react'
import { keccak256 } from 'ethers/lib/utils.js'
import { createUserIdFromEthereumAddress, getUsernameFromId } from '../types/user-identifier'
import {
    AuthenticationData,
    AuthenticationError,
    LoginFlows,
    LoginStatus,
    LoginTypePublicKey,
    LoginTypePublicKeyEthereum,
    RegisterRequest,
    RegistrationAuthentication,
} from './login'
import { getChainName } from '../utils/zion-utils'

import { StatusCodes } from 'http-status-codes'
import { SiweMessage } from 'siwe'
import { Buffer } from 'buffer'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useZionContext } from '../components/ZionContextProvider'
import { useCredentialStore } from '../store/use-credential-store'
import { useMatrixStore } from '../store/use-matrix-store'
import { newMatrixLoginSession, newMatrixRegisterSession } from './session'
import { useNetwork } from 'wagmi'
import { signMessageAbortListener } from '../client/SignMessageAbortController'

interface SignedAuthenticationData {
    signature: string
    message: string
}

export function useMatrixWalletSignIn() {
    const { loginStatus, setLoginError, setLoginStatus } = useMatrixStore()
    const { homeServerUrl: homeServer, clientSingleton } = useZionContext()
    const { setMatrixCredentials } = useCredentialStore()
    const { signer, chain, activeWalletAddress } = useWeb3Context()
    const { chain: walletChain } = useNetwork()
    // `chain` is the chain we initialize the lib to
    // `walletChain` is the user's current chain in their wallet extension
    // Though we use `chain` to sign the message, (allowing user to sign in on correct network for lib, regardless of chain in wallet),
    // for greater transparency and less confusion, this prop is provided for clients to implement their own UX for this scenario
    const userOnWrongNetworkForSignIn = useMemo(() => {
        return chain?.id !== walletChain?.id
    }, [walletChain, chain])

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

    const authenticationDone = useCallback(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function (
            response: IAuthData,
            authData: AuthenticationData,
            loggedInWalletAddress: `0x${string}` | undefined,
        ) {
            const { access_token, device_id, user_id } = response
            if (access_token && device_id && user_id && loggedInWalletAddress) {
                // set zion_siwe cookie on successful registration
                document.cookie = setZionSiweCookie(authData)
                setMatrixCredentials(homeServer, {
                    accessToken: access_token,
                    deviceId: device_id,
                    userId: user_id,
                    username: getUsernameFromId(user_id),
                    loggedInWalletAddress,
                })
                setLoginStatus(LoginStatus.LoggedIn)
                // call onLogin event handler
                clientSingleton?.onLogin?.({
                    userId: keccak256(activeWalletAddress as string).substring(0, 34),
                })
            } else {
                setLoginError({
                    code: StatusCodes.UNAUTHORIZED,
                    message: 'Server did not return access_token, user_id, and / or device_id',
                })
                setLoginStatus(LoginStatus.LoggedOut)
            }
        },
        [
            activeWalletAddress,
            clientSingleton,
            homeServer,
            setLoginError,
            setLoginStatus,
            setMatrixCredentials,
        ],
    )

    const signMessage = useCallback(
        async function (statement: string): Promise<SignedAuthenticationData | undefined> {
            console.log(`[signMessage] start`)
            if (!userIdentifier || !userIdentifier.accountAddress) {
                console.log(`[signMessage] no userIdentifier or accountAddress`)
                return undefined
            }
            if (!homeServer) {
                console.log(`[signMessage] undefined homeServer`)
                return undefined
            }
            if (!signer) {
                console.log(`[signMessage] undefined signer`)
                return undefined
            }
            const messageToSign = createMessageToSign({
                walletAddress: userIdentifier.accountAddress,
                chainId: userIdentifier.chainId,
                statement,
            })

            // Prompt the user to sign the message.
            const signature = await signer.signMessage(messageToSign)

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
        [homeServer, signer, userIdentifier],
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

                const signedAuthenticationData = await Promise.race([
                    signMessageAbortListener(),
                    signMessage(args.statement),
                ])
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
                                        authenticationDone(
                                            response,
                                            authData as AuthenticationData,
                                            userIdentifier.accountAddress,
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
            authenticationDone,
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
                                            authenticationDone(
                                                response as IAuthData,
                                                auth,
                                                userIdentifier.accountAddress,
                                            )
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
                                        message: `Your wallet signature attempt failed. Please try again.`,
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
            authenticationDone,
            createAndSignAuthData,
            homeServer,
            loginStatus,
            setLoginStatus,
            userIdentifier,
        ],
    )

    return {
        userOnWrongNetworkForSignIn,
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
    return url.port ? `${url.hostname}:${url.port}` : url.hostname
}

/**
 * Create a message for signing. See https://eips.ethereum.org/EIPS/eip-4361
 * for message template.
 */
export function createMessageToSign(args: {
    walletAddress: string | undefined
    chainId: number
    statement: string
}): string {
    /**
        // EIP-4361 message template:
        authority: string // is the RFC 3986 authority that is requesting the signing.
        address: string // is the Ethereum address performing the signing conformant to capitalization encoded checksum specified in EIP-55 where applicable.
        version: string // version of the Matrix public key spec that the client is complying with.
        chainId: number // is the EIP-155 Chain ID to which the session is bound, and the network where Contract Accounts must be resolved.
        statement: string // is a human-readable ASCII assertion that the user will sign, and it must not contain '\n' (the byte 0x0a).
        uri: string // is an RFC 3986 URI referring to the resource that is the subject of the signing
    */
    const siweMessage = new SiweMessage({
        domain: getAuthority(window.location.origin),
        address: args.walletAddress,
        statement: args.statement,
        uri: window.location.origin,
        version: '1',
        chainId: args.chainId,
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
        maxAge: 60 * 60 * 24 * 365, // 1 year
    }
    // this doesn't work for onrender.com preview environments, which requires domain to equal hostname
    return `${cookie.name}=${cookie.value}; path=${cookie.path}; secure=${cookie.secure}; sameSite=${cookie.sameSite}; domain=${cookie.domain}; max-age=${cookie.maxAge};`
}
