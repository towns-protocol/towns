import { PrivyClient } from '@privy-io/server-auth'
import { Env } from '.'
import { isPaymasterResponse, SponsorshipRequest } from './types'
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
import { createErrorResponse, createSuccessResponse, ErrorCode } from './createResponse'

export async function handleVerifications(args: {
    request: WorkerRequest
    privyClient: PrivyClient
    data: SponsorshipRequest<'0.6'>['data'] | SponsorshipRequest<'0.7'>['data']
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
        return createErrorResponse(401, 'invalid auth token', ErrorCode.INVALID_PRIVY_AUTH_TOKEN)
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

        // todo: all other on-chain write functions exposed in app (see @towns-protocol/web3 for list)
        switch (functionHash) {
            // client only allows transferring assets out of "Towns wallet", we can sponsor this
            case 'withdraw':
            case 'upgradeToAndCall':
            case 'transferTokens': {
                break
            }
            // todo: functionHash should be a keccak hash of the function signature
            case 'createSpaceWithPrepay':
            case 'createSpace': {
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyCreateSpace({
                        privyDid: verifiedClaims.userId,
                        rootKeyAddress: root,
                        senderAddress: sender,
                        env,
                    })
                    if (!verification.verified) {
                        const errorDetail = verification.errorDetail
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail?.description}`,
                            errorDetail?.code,
                        )
                    }
                }
                break
            }
            case 'joinSpace': {
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }

                if (!townId) {
                    return createErrorResponse(
                        400,
                        invalidTownErrorMessage,
                        ErrorCode.INVALID_SPACE,
                    )
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyJoinTown({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        townId: townId,
                        env,
                    })
                    if (!verification.verified) {
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail.description}`,
                            verification.errorDetail.code,
                        )
                    }
                }
                break
            }
            case 'removeLink':
            case 'linkCallerToRootKey':
            case 'linkWalletToRootKey': {
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyLinkWallet({
                        rootKeyAddress: root,
                        senderAddress: sender,
                        functionHash: functionHash,
                        env,
                    })
                    if (!verification.verified) {
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail.description}`,
                            verification.errorDetail.code,
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
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }
                if (!townId) {
                    return createErrorResponse(
                        400,
                        `Missing townId, cannot verify town exists`,
                        ErrorCode.INVALID_SPACE,
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
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail.description}`,
                            verification.errorDetail.code,
                        )
                    }
                }
                break
            }
            case 'updateSpaceInfo': {
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }
                if (!townId) {
                    return createErrorResponse(
                        400,
                        `Missing townId, cannot verify town exists`,
                        ErrorCode.INVALID_SPACE,
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
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail.description}`,
                            verification.errorDetail.code,
                        )
                    }
                }
                break
            }
            case 'createSpace_linkWallet': {
                // this flow is specifically for a new user
                // they have not linked their wallet or joined or created a town yet
                // therefore we don't need any checks

                const { errorDetail } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }

                break
            }
            case 'joinSpace_linkWallet': {
                // this flow is specifically for a new user
                // they have not linked their wallet or joined or created a town yet
                // therefore we don't need any checks
                const { errorDetail } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }

                if (!townId) {
                    return createErrorResponse(
                        400,
                        `Missing townId, cannot verify that town does not exist`,
                        ErrorCode.INVALID_SPACE,
                    )
                }

                break
            }
            case 'editMembershipSettings': {
                const { errorDetail, root, sender } = commonChecks({
                    rootKeyAddress: rootKeyAddress,
                    sender: userOperation.sender,
                })
                if (errorDetail) {
                    return createErrorResponse(400, errorDetail.description, errorDetail.code)
                }
                if (!townId) {
                    return createErrorResponse(
                        400,
                        `Missing townId, cannot verify town exists`,
                        ErrorCode.INVALID_SPACE,
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
                        return createErrorResponse(
                            401,
                            `Unauthorized: ${verification.errorDetail.description}`,
                            verification.errorDetail.code,
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
                return createErrorResponse(
                    404,
                    `Unknown functionHash ${functionHash}`,
                    ErrorCode.UNKNOWN_OPERATION,
                )
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
    const json = await paymasterResponse.json()
    if (!isPaymasterResponse(json)) {
        return createErrorResponse(
            400,
            'Invalid Paymaster Response',
            ErrorCode.INVALID_PAYMASTER_RESPONSE,
        )
    }
    const statusCode = paymasterResponse.status
    if (statusCode !== 200) {
        const limitExceeded = json?.error?.message.includes('exceeded')
        return createErrorResponse(
            statusCode,
            `Invalid Paymaster Response: code ${json?.error?.code}, message ${json?.error?.message}`,
            limitExceeded ? ErrorCode.PAYMASTER_LIMIT_REACHED : ErrorCode.PAYMASTER_ERROR,
        )
    } else {
        if (json.error) {
            const spaceDapp = await createSpaceDappForNetwork(env)
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

            return createErrorResponse(
                500,
                spaceDappError ? spaceDappErrorMessage : 'Internal Service Error',
                ErrorCode.UNKNOWN_ERROR,
            )
        }
        console.log('PM API response:', json.result)
        return createSuccessResponse(200, 'Success', json.result)
    }
}
