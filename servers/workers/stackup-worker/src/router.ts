import { Router } from 'itty-router'
import { Env } from '.'
import {
    isTownsUserOperation,
    isPaymasterResponse,
    isOverrideOperation,
    Overrides,
    isWhitelistOperation,
    Whitelist,
    isTransactionLimitRequest,
} from './types'
import { TRANSACTION_LIMIT_DEFAULTS_PER_DAY } from './useropVerification'

import { isErrorType, Environment } from 'worker-common'
import {
    WorkerRequest,
    getContentAsJson,
    durationLogger,
    createStackupPMSponsorUserOperationRequest,
    createAlchemyRequestGasAndPaymasterDataRequest,
} from './utils'
import { contractAddress, createFilterWrapper, runLogQuery } from './logFilter'
import { checkMintKVOverrides } from './checks'
import { createSpaceDappForNetwork, networkMap } from './provider'
import { verifyPrivyAuthToken } from './privy'
import { PrivyClient } from '@privy-io/server-auth'
import { handlePaymasterResponse, handleVerifications } from './sponsorHelpers'

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
    const content = await getContentAsJson(request)
    if (!content || !isTransactionLimitRequest(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    const { environment, operation, rootAddress, blockLookbackNum, privyDid } = content

    // TODO: we've never used this api, it's not intended for the public
    // if we want to bypass using a privyDid, and only use the rootAddress
    // we can query the privy api using https://docs.privy.io/guide/server/users/search, query by rootAddress, and then use the received privyDid
    // however that takes 6+ seconds

    try {
        switch (operation) {
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
                    return new Response(toJson({ error: 'Internal Service Error' }), {
                        status: 500,
                    })
                }
                const restricted = await checkMintKVOverrides(rootAddress, privyDid, env)
                return new Response(
                    toJson({
                        ...queryResult,
                        maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createSpace,
                        restricted: !restricted?.verified,
                    }),
                    { status: 200 },
                )
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
                return new Response(toJson({ error: `Unknown operation ${operation}` }), {
                    status: 404,
                })
        }
    } catch (error) {
        console.error(`returned error: ${isErrorType(error) ? error?.message : 'Unknown error'}`)
        return new Response(toJson({ error: 'Internal Service Error' }), { status: 500 })
    }
})

router.post('/api/sponsor-userop', async (request: WorkerRequest, env: Env, { privyClient }) => {
    if (env.REFUSE_ALL_OPS === 'true') {
        return new Response(toJson({ error: 'User operations are not available' }), { status: 503 })
    }
    const content = await getContentAsJson(request)
    if (!content || !isTownsUserOperation(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    const { data } = content

    const { townId, functionHash, rootKeyAddress, ...userOperation } = data

    const verificationErrorResponse = await handleVerifications({
        privyClient,
        request,
        data,
        env,
    })

    if (verificationErrorResponse) {
        return verificationErrorResponse
    }

    const requestInit = createStackupPMSponsorUserOperationRequest({
        userOperation,
        entryPoint: env.ERC4337_ENTRYPOINT_ADDRESS,
        // can be 'payg' or 'erc20token'
        // see https://docs.stackup.sh/reference/pm-sponsoruseroperation
        type: { type: 'payg' },
    })
    console.log('paymaster API request:', requestInit.body)
    const durationStackupApiRequest = durationLogger('paymaster API Request')
    const responseFetched = await fetch(`${env.STACKUP_PAYMASTER_RPC_URL}`, requestInit)
    durationStackupApiRequest()

    return handlePaymasterResponse({
        paymasterResponse: responseFetched,
        env,
        townId,
    })
    // proxy successful VerifyingPaymasterResult response to caller
})

router.post(
    '/api/sponsor-userop/alchemy',
    async (request: WorkerRequest, env: Env, { privyClient }) => {
        if (env.REFUSE_ALL_OPS === 'true') {
            return new Response(toJson({ error: 'User operations are not available' }), {
                status: 503,
            })
        }
        const content = await getContentAsJson(request)
        if (!content || !isTownsUserOperation(content)) {
            return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
        }
        const { data } = content

        const { townId, functionHash, rootKeyAddress, ...userOperation } = data

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
            return new Response(toJson({ error: 'ALCHEMY_GM_POLICY_ID not set' }), { status: 405 })
        }
        if (!env.ALCHEMY_PAYMASTER_RPC_URL) {
            return new Response(toJson({ error: 'ALCHEMY_PAYMASTER_RPC_URL not set' }), {
                status: 405,
            })
        }

        const requestInit = createAlchemyRequestGasAndPaymasterDataRequest({
            policyId: env.ALCHEMY_GM_POLICY_ID,
            userOperation,
            entryPoint: env.ERC4337_ENTRYPOINT_ADDRESS,
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
        // proxy successful VerifyingPaymasterResult response to caller
    },
)

router.post('/admin/api/add-override', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getContentAsJson(request)
    if (!content || !isOverrideOperation(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    const { operation, enabled, n } = content
    switch (operation) {
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
            return new Response(toJson({ error: `Unknown operation ${operation}` }), {
                status: 404,
            })
    }
    return new Response('Ok', { status: 200 })
})

router.post('/admin/api/add-to-whitelist', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getContentAsJson(request)
    if (!content || !isWhitelistOperation(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    const { operation, enabled, data } = content
    switch (operation) {
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
            return new Response(toJson({ error: `Unknown operation ${operation}` }), {
                status: 404,
            })
    }
    return new Response('Ok', { status: 200 })
})

router.get('*', () => new Response('Not Found', { status: 404 }))

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
