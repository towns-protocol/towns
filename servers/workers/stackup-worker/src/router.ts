import { Router } from 'itty-router'
import { Env } from '.'
import {
    isOverrideOperation,
    Overrides,
    isWhitelistOperation,
    Whitelist,
    isTransactionLimitRequest,
    isEntrypointV07SponsorshipRequest,
    isEntrypoinV06SponsorshipRequest,
    isSmartAccountRequest,
} from './types'
import { TRANSACTION_LIMIT_DEFAULTS_PER_DAY } from './useropVerification'

import { isErrorType } from 'worker-common'
import {
    WorkerRequest,
    getJson,
    durationLogger,
    createPMSponsorUserOperationRequest,
    createAlchemyRequestGasAndPaymasterDataRequest,
} from './utils'
import { contractAddress, createFilterWrapper, runLogQuery } from './logFilter'
import { checkMintKVOverrides } from './checks'
import { createSpaceDappForNetwork, networkMap } from './provider'
import { verifyPrivyAuthToken } from './privy'
import { PrivyClient } from '@privy-io/server-auth'
import { handlePaymasterResponse, handleVerifications } from './sponsorHelpers'
import { createErrorResponse, createSuccessResponse, ErrorCode } from './createResponse'
import { determineSmartAccount } from './determineSmartAccount'

const router = Router()

/* Check transaction limits for a wallet
 *  Arguments:
 * - environment: Environment
 * - operation: "createSpace" | "joinTown" | "linkWallet" ...
 * - rootAddress: string
 * - privyDid: string
 * - blockLookbackNum (optional)
 *
 */
router.post('/api/transaction-limits', async (request: WorkerRequest, env: Env) => {
    // check payload is IUserOperation with townId
    const content = await getJson(request)
    if (!content || !isTransactionLimitRequest(content)) {
        return createErrorResponse(400, 'Bad Request', ErrorCode.BAD_REQUEST)
    }
    const { environment, operation, rootAddress, blockLookbackNum, privyDid } = content

    // TODO: we've never used this api, it's not intended for the public
    // if we want to bypass using a privyDid, and only use the rootAddress
    // we can query the privy api using https://docs.privy.io/guide/server/users/search, query by rootAddress, and then use the received privyDid
    // however that takes 6+ seconds

    try {
        switch (operation) {
            case 'createSpaceWithPrepay':
            case 'createSpace': {
                // default: any wallet that exists in HNT Privy DB can make: 3 towns / day with no gas costs
                // more restrictive: only wallets created by email addresses on HNT Labs curated whitelist can mint 3 towns / day with no gas costs
                const network = networkMap.get(environment)
                if (!network) {
                    console.error(`Unknown environment network: ${environment}`)
                    return null
                }
                const townFactoryAddress = await contractAddress(network, 'SpaceFactory')
                const queryResult = await runLogQuery({
                    environment,
                    network,
                    env,
                    contractName: 'SpaceOwner',
                    eventName: 'Transfer',
                    eventArgs: [townFactoryAddress, rootAddress],
                    createFilterFunc: createFilterWrapper,
                    blockLookbackNum,
                    townId: undefined,
                })
                if (!queryResult) {
                    return createErrorResponse(
                        500,
                        'unable to query for space',
                        ErrorCode.QUERY_ERROR,
                    )
                }
                const restricted = await checkMintKVOverrides(rootAddress, privyDid, env)
                return createSuccessResponse(200, 'Transaction Limits', {
                    ...queryResult,
                    maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createSpace,
                    restricted: !restricted?.verified,
                })
            }
            case 'joinSpace': {
                // default: if a town exists and membership price is $0, any wallet address that exists in HNT Privy DB
                // can mint a membership with no gas costs. Note; $0 price means either free allocation remaining or prepaid Town.
                // more restrictive: only towns on HNT Labs curated whitelist can allow for Users to mint with no gas costs.
                break
            }
            case 'removeLink':
            case 'linkCallerToRootKey':
            case 'linkWalletToRootKey': {
                // default: any wallet address that exists in HNT Privy DB can link 10 wallets / day with no gas costs.
                // more restrictive: only addresses in HNT Labs curated whitelist can perform these actions.
                break
            }
            case 'createRole':
            case 'removeRole':
            case 'updateRole':
            case 'addRoleToChannel':
            case 'removeRoleFromChannel':
            case 'removeEntitlementModule':
            case 'addEntitlementModule': {
                // default: roles can be changed / entitlements set for a valid town: 20 times / day
                // more restrictive: only Towns on HNT Labs curated whitelist can perform these 2 actions
                break
            }
            case 'createChannel':
            case 'createChannelWithOverridePermissions':
            case 'updateChannel':
            case 'removeChannel': {
                // default: channels can be created for a valid town 10 times / day
                // more restrictive: only Towns on HNT Labs curated whitelist can perform these 3 actions
                break
            }
            case 'ban':
            case 'unban': {
                // default: ban/unban can be performed for a valid town 10 times / day
                // more restrictive: only Towns on HNT Labs curated whitelist can perform these 2 actions
                break
            }
            case 'updateSpaceInfo': {
                // todo:
                break
            }

            case 'setChannelPermissionOverrides': {
                // todo:
                break
            }
            case 'clearChannelPermissionOverrides': {
                // todo:
                break
            }

            default:
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                return createErrorResponse(
                    404,
                    `Unknown operation ${operation}`,
                    ErrorCode.UNKNOWN_OPERATION,
                )
        }
    } catch (error) {
        console.error(`returned error: ${isErrorType(error) ? error?.message : 'Unknown error'}`)
        return createErrorResponse(500, 'Internal Service Error', ErrorCode.UNKNOWN_ERROR)
    }
})

router.post('/api/sponsor-userop', async (request: WorkerRequest, env: Env, { privyClient }) => {
    if (env.REFUSE_ALL_OPS === 'true') {
        return createErrorResponse(
            503,
            'User operations are not available',
            ErrorCode.UNKNOWN_ERROR,
        )
    }

    const sponsorshipReq = await getJson(request)

    if (
        !isEntrypoinV06SponsorshipRequest(sponsorshipReq) &&
        !isEntrypointV07SponsorshipRequest(sponsorshipReq)
    ) {
        return createErrorResponse(400, 'Invalid User Operation', ErrorCode.INVALID_USER_OPERATION)
    }
    const { data } = sponsorshipReq

    const verificationErrorResponse = await handleVerifications({
        privyClient,
        request,
        data,
        env,
    })

    if (verificationErrorResponse) {
        return verificationErrorResponse
    }

    // This endpoint does not support gas overrides
    const requestInit = createPMSponsorUserOperationRequest({
        sponsorshipReq,
    })
    console.log('paymaster API request:', requestInit.body)
    const durationStackupApiRequest = durationLogger('paymaster API Request')
    const responseFetched = await fetch(`${env.LOCAL_PAYMASTER_RPC_URL}`, requestInit)
    durationStackupApiRequest()

    return handlePaymasterResponse({
        paymasterResponse: responseFetched,
        env,
        townId: data.townId,
    })
    // proxy successful VerifyingPaymasterResult response to caller
})

router.post(
    '/api/sponsor-userop/alchemy',
    async (request: WorkerRequest, env: Env, { privyClient }) => {
        if (env.REFUSE_ALL_OPS === 'true') {
            return createErrorResponse(
                503,
                'User operations are not available',
                ErrorCode.UNKNOWN_ERROR,
            )
        }
        const sponsorshipReq = await getJson(request)
        if (
            !isEntrypoinV06SponsorshipRequest(sponsorshipReq) &&
            !isEntrypointV07SponsorshipRequest(sponsorshipReq)
        ) {
            return createErrorResponse(400, 'Bad Request', ErrorCode.INVALID_USER_OPERATION)
        }

        const { data } = sponsorshipReq

        const verificationErrorResponse = await handleVerifications({
            privyClient,
            request,
            data,
            env,
        })

        if (verificationErrorResponse) {
            return verificationErrorResponse
        }

        if (!env.ALCHEMY_GM_POLICY_ID) {
            return createErrorResponse(
                405,
                'ALCHEMY_GM_POLICY_ID not set',
                ErrorCode.MISSING_ENV_VARIABLE,
            )
        }
        if (!env.ALCHEMY_PAYMASTER_RPC_URL) {
            return createErrorResponse(
                405,
                'ALCHEMY_PAYMASTER_RPC_URL not set',
                ErrorCode.MISSING_ENV_VARIABLE,
            )
        }

        const requestInit = createAlchemyRequestGasAndPaymasterDataRequest({
            policyId: env.ALCHEMY_GM_POLICY_ID,
            sponsorshipReq,
        })
        console.log('paymaster API request:', requestInit.body)
        const durationAlchemyApiRequest = durationLogger('paymaster API Request')
        const responseFetched = await fetch(`${env.ALCHEMY_PAYMASTER_RPC_URL}`, requestInit)
        durationAlchemyApiRequest()

        return handlePaymasterResponse({
            paymasterResponse: responseFetched,
            env,
            townId: data.townId,
        })
    },
)

router.post(
    '/api/sponsor-userop/open',
    async (request: WorkerRequest, env: Env, { privyClient }) => {
        if (env.REFUSE_ALL_OPS === 'true') {
            return createErrorResponse(
                503,
                'User operations are not available',
                ErrorCode.UNKNOWN_ERROR,
            )
        }
        const sponsorshipReq = await getJson(request)
        if (
            !isEntrypoinV06SponsorshipRequest(sponsorshipReq) &&
            !isEntrypointV07SponsorshipRequest(sponsorshipReq)
        ) {
            return createErrorResponse(400, 'Bad Request', ErrorCode.INVALID_USER_OPERATION)
        }

        const endVerifyAuthTokenDuration = durationLogger('Verify Auth Token')
        const verifiedClaims = await verifyPrivyAuthToken({
            request,
            privyClient,
            env,
        })
        endVerifyAuthTokenDuration()

        if (!verifiedClaims) {
            return createErrorResponse(
                401,
                'invalid auth token',
                ErrorCode.INVALID_PRIVY_AUTH_TOKEN,
            )
        }

        const { townId, ...userOperation } = sponsorshipReq.data

        if (!env.ALCHEMY_GM_POLICY_ID_OPEN) {
            return createErrorResponse(
                405,
                'ALCHEMY_GM_POLICY_ID_OPEN not set',
                ErrorCode.MISSING_ENV_VARIABLE,
            )
        }
        if (!env.ALCHEMY_PAYMASTER_RPC_URL) {
            return createErrorResponse(
                405,
                'ALCHEMY_PAYMASTER_RPC_URL not set',
                ErrorCode.MISSING_ENV_VARIABLE,
            )
        }

        const requestInit = createAlchemyRequestGasAndPaymasterDataRequest({
            policyId: env.ALCHEMY_GM_POLICY_ID_OPEN,
            sponsorshipReq,
        })
        console.log('paymaster API request:', requestInit.body)
        const durationAlchemyApiRequest = durationLogger('paymaster API Request')
        const responseFetched = await fetch(`${env.ALCHEMY_PAYMASTER_RPC_URL}`, requestInit)
        durationAlchemyApiRequest()
        return handlePaymasterResponse({
            paymasterResponse: responseFetched,
            env,
            townId,
        })
    },
)

router.post('/admin/api/add-override', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getJson(request)
    if (!content || !isOverrideOperation(content)) {
        return createErrorResponse(400, 'Bad Request', ErrorCode.BAD_REQUEST)
    }
    const { operation, enabled, n } = content
    switch (operation as Overrides) {
        case Overrides.EveryWalletCanMintWhitelistedEmail: {
            await env.OVERRIDES.put(operation, toJson({ operation: operation, enabled: enabled }))
            break
        }
        case Overrides.EveryWhitelistedWalletCanLinkNWallets: {
            await env.OVERRIDES.put(
                operation,
                toJson({ operation: operation, enabled: enabled, n: n }),
            )
            break
        }
        case Overrides.EveryWalletCanJoinTownOnWhitelist: {
            await env.OVERRIDES.put(operation, toJson({ operation: operation, enabled: enabled }))
            break
        }
        case Overrides.EveryWalletCanUseTownOnWhitelist: {
            await env.OVERRIDES.put(operation, toJson({ operation: operation, enabled: enabled }))
            break
        }
        default:
            return createErrorResponse(
                404,
                `Unknown operation ${operation}`,
                ErrorCode.UNKNOWN_OPERATION,
            )
    }
    return createSuccessResponse(200, 'Ok')
})

router.post('/admin/api/add-to-whitelist', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getJson(request)
    if (!content || !isWhitelistOperation(content)) {
        return createErrorResponse(400, 'Bad Request', ErrorCode.BAD_REQUEST)
    }
    const { operation, enabled, data } = content
    switch (operation as Whitelist) {
        case Whitelist.EmailWhitelist: {
            // add to KV
            // todo: check if email is valid
            await env.EMAIL_WHITELIST.put(data, toJson({ data: data, enabled: enabled }))
            break
        }
        case Whitelist.AddressWhitelist: {
            // privy address whitelist
            await env.ADDRESS_WHITELIST.put(data, toJson({ data: data, enabled: enabled }))
            break
        }
        case Whitelist.TownIdWhitelist: {
            // add to KV
            // todo: check if townId is conformant
            await env.TOWN_WHITELIST.put(data, toJson({ data: data, enabled: enabled }))
            break
        }
        default:
            return createErrorResponse(
                404,
                `Unknown operation ${operation}`,
                ErrorCode.UNKNOWN_OPERATION,
            )
    }
    return createSuccessResponse(200, 'Ok')
})

/**
 * Determine the smart account address for a given owner address and new account implementation type
 *
 * @param request - The request object
 * @param request.params.ownerAddress - The owner address
 * @param request.query.newAccountImplementationType - The type of smart accounts for new users. Note this does not mean the returned smart account will be of this type.
 * @param env - The environment object
 * @returns A success response with the smart account address and the current account type (simple or modular)
 * { address: '0x1234567890123456789012345678901234567890', accountType: 'simple' }
 *
 * @example
 *  /api/smart-account/0x1234567890123456789012345678901234567890?newAccountImplementationType=simple'
 *
 */
router.get('/api/smart-account/:ownerAddress', async (request: WorkerRequest, env: Env) => {
    const { query, params } = request

    const content = {
        newAccountImplementationType: query?.newAccountImplementationType,
        ownerAddress: params?.ownerAddress,
    }
    if (!content || !isSmartAccountRequest(content)) {
        return createErrorResponse(400, 'Bad Request', ErrorCode.BAD_REQUEST)
    }
    const { newAccountImplementationType, ownerAddress } = content
    const smartAccount = await determineSmartAccount({
        newAccountImplementationType: newAccountImplementationType as
            | 'simple'
            | 'modular'
            | undefined,
        ownerAddress,
        environment: env.ENVIRONMENT,
        env,
    })
    return createSuccessResponse(200, 'Ok', {
        address: smartAccount.address,
        accountType: smartAccount.accountType,
    })
})

router.get('*', () => createErrorResponse(404, 'Not Found', ErrorCode.NOT_FOUND))

export const handleRequest = (
    request: WorkerRequest,
    env: Env,
    addl: {
        privyClient: PrivyClient
    },
) => router.handle(request, env, addl)

function toJson(data: object | undefined) {
    return JSON.stringify(data)
}
