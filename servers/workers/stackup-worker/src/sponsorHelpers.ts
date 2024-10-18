import { PrivyClient } from '@privy-io/server-auth'
import { Env } from '.'
import { isPaymasterResponse, TownsUserOperation } from './types'
import {
    verifyCreateSpace,
    verifyJoinTown,
    verifyLinkWallet,
    verifyUpdateSpaceInfo,
    verifyUseTown,
} from './useropVerification'
import {
    commonChecks,
    durationLogger,
    invalidTownErrorMessage,
    toJson,
    WorkerRequest,
} from './utils'
import { isErrorType } from 'worker-common'
import { verifyPrivyAuthToken } from './privy'
import { createSpaceDappForNetwork } from './provider'

export async function handleVerifications(args: {
    request: WorkerRequest
    privyClient: PrivyClient
    data: TownsUserOperation['data']
    env: Env
}) {
    const { functionHash, rootKeyAddress, townId, ...userOperation } = args.data
    const { request, privyClient, env } = args

    const endVerifyAuthTokenDuration = durationLogger('Verify Auth Token')
    const verifiedClaims = await verifyPrivyAuthToken({
        request,
        privyClient,
        env,
    })
    endVerifyAuthTokenDuration()
    if (!verifiedClaims) {
        return new Response(toJson({ error: 'invalid auth token' }), { status: 401 })
    }

    try {
        /* createSpace (TownArchitect.sol)
		/* joinTown (MembershipFacet.sol)
        */
        /* linkWalletToRootKey (WalletLink.sol)
          1. check if wallet is already linked
          2. check if wallet has any links left
          3. check total number of link actions per wallet
        */

        // todo: all other on-chain write functions exposed in app (see @river-build/web3 for list)
        switch (functionHash) {
            // client only allows transferring assets out of "Towns wallet", we can sponsor this
            case 'withdraw':
            case 'transferTokens': {
                break
            }
            // todo: functionHash should be a keccak hash of the function signature
            case 'createSpaceWithPrepay':
            case 'createSpace': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyCreateSpace({
                        privyDid: verifiedClaims.userId,
                        rootKeyAddress: root,
                        senderAddress: sender,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }
            case 'joinSpace': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }

                if (!townId) {
                    return new Response(invalidTownErrorMessage, {
                        status: 400,
                    })
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyJoinTown({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        townId: townId,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }
            case 'removeLink':
            case 'linkCallerToRootKey':
            case 'linkWalletToRootKey': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyLinkWallet({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        functionHash: functionHash,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }
            // refreshMetadata is a erc 4906 metadata update
            case 'refreshMetadata': {
                break
            }
            case 'createRole':
            case 'removeRole':
            case 'updateRole':
            case 'addRoleToChannel':
            case 'removeRoleFromChannel':
            case 'removeEntitlementModule':
            case 'addEntitlementModule':
            case 'createChannel':
            case 'createChannelWithOverridePermissions':
            case 'updateChannel':
            case 'removeChannel':
            case 'ban':
            case 'unban': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }
                if (!townId) {
                    return new Response(
                        toJson({ error: `Missing townId, cannot verify town exists` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyUseTown({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        townId: townId,
                        env,
                        transactionName: functionHash,
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }
            case 'updateSpaceInfo': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }
                if (!townId) {
                    return new Response(
                        toJson({ error: `Missing townId, cannot verify town exists` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyUpdateSpaceInfo({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        townId: townId,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }
            case 'createSpace_linkWallet': {
                // this flow is specifically for a new user
                // they have not linked their wallet or joined or created a town yet
                // therefore we don't need any checks

                const { errorMessage } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }

                break
            }
            case 'joinSpace_linkWallet': {
                // this flow is specifically for a new user
                // they have not linked their wallet or joined or created a town yet
                // therefore we don't need any checks
                const { errorMessage } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }

                if (!townId) {
                    return new Response(
                        toJson({
                            error: `Missing townId, cannot verify that town does not exist`,
                        }),
                        {
                            status: 400,
                        },
                    )
                }

                break
            }
            case 'editMembershipSettings': {
                const { errorMessage, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorMessage) {
                    return new Response(toJson({ error: errorMessage }), { status: 400 })
                }
                if (!townId) {
                    return new Response(
                        toJson({ error: `Missing townId, cannot verify town exists` }),
                        {
                            status: 400,
                        },
                    )
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyUseTown({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        townId: townId,
                        env,
                        transactionName: 'updateRole',
                    })
                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }

                    if (!verification.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verification.error}` }),
                            { status: 401 },
                        )
                    }
                }
                break
            }

            case 'setChannelPermissionOverrides': {
                break
            }

            case 'clearChannelPermissionOverrides': {
                break
            }

            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return new Response(toJson({ error: `Unknown functionHash ${functionHash}` }), {
                    status: 404,
                })
        }
    } catch (error) {
        console.error(`KV returned error: ${isErrorType(error) ? error?.message : 'Unknown error'}`)
        return new Response(toJson({ error: 'Internal Service Error' }), { status: 500 })
    }
}

export async function handlePaymasterResponse(args: {
    paymasterResponse: Awaited<ReturnType<typeof fetch>>
    env: Env
    townId?: string
}): Promise<Response> {
    const { paymasterResponse, env, townId } = args
    if (paymasterResponse.status !== 200) {
        return new Response(toJson({ error: 'Invalid Paymaster Response' }), {
            status: paymasterResponse.status,
        })
    }
    const json = await paymasterResponse.json()
    if (!isPaymasterResponse(json)) {
        return new Response(toJson({ error: 'Invalid Paymaster Response' }), { status: 400 })
    }
    const statusCode = paymasterResponse.status
    if (statusCode !== 200) {
        return new Response(toJson({ error: 'Paymaster Error' }), {
            status: statusCode,
            statusText: `Error code ${json?.error?.code}, message ${json?.error?.message}`,
        })
    } else {
        if (json.error) {
            const spaceDapp = await createSpaceDappForNetwork(env)
            const error = json.error
            let spaceDappError: Error | undefined
            if (spaceDapp) {
                if (townId) {
                    spaceDappError = spaceDapp.parseSpaceError(townId, json.error)
                } else {
                    spaceDappError = spaceDapp.parseSpaceFactoryError(json.error)
                }
            }

            const spaceDappErrorMessage = `${spaceDappError?.message} ${spaceDappError?.name}`

            console.error(`PM API returned error: ${json.error.code}, ${json.error.message}`)
            console.error(`Parsed error from SpaceDapp: ${spaceDappErrorMessage}`)

            return new Response(
                toJson({
                    error: spaceDappError ? spaceDappErrorMessage : 'Internal Service Error',
                }),
                {
                    status: 500,
                    statusText: `Error code ${json.error.code}, message ${
                        spaceDappError ? spaceDappErrorMessage : json.error.message
                    }`,
                },
            )
        }
        console.log('PM API response:', json.result)
        return new Response(toJson(json.result), { status: 200 })
    }
}
