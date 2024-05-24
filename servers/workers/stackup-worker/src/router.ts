import { Router } from 'itty-router'
import { Env } from '.'
import {
    isTownsUserOperation,
    isHexString,
    isPmSponsorUserOperationResponse,
    isOverrideOperation,
    Overrides,
    isWhitelistOperation,
    Whitelist,
    isTransactionLimitRequest,
    EventName,
} from './types'
import {
    TRANSACTION_LIMIT_DEFAULTS_PER_DAY,
    verifyCreateSpace,
    verifyJoinTown,
    verifyLinkWallet,
    verifyUpdateSpaceInfo,
    verifyUseTown,
} from './useropVerification'

import { isErrorType, Environment } from 'worker-common'
import { WorkerRequest, createPmSponsorUserOperationRequest, getContentAsJson } from './utils'
import { contractAddress, createFilterWrapper, runLogQuery } from './logFilter'
import { IVerificationResult, checkMintKVOverrides } from './checks'
import { createSpaceDappForNetwork, networkMap } from './provider'
import { UNKNOWN_ERROR } from '@river-build/web3'

// can be 'payg' or 'erc20token'
// see https://docs.stackup.sh/reference/pm-sponsoruseroperation
const contextType = 'payg'
// todo: move ot env var
export const STACKUP_API_URL = 'https://api.stackup.sh/v1/paymaster'

const router = Router()

/* Check transaction limits for a wallet
 *  Arguments:
 * - environment: Environment
 * - operation: "createSpace" | "joinTown" | "linkWallet" ...
 * - rootAddress: string
 * - blockLookbackNum (optional)
 *
 */
router.post('/api/transaction-limits', async (request: WorkerRequest, env: Env) => {
    // check payload is IUserOperation with townId
    const content = await getContentAsJson(request)
    if (!content || !isTransactionLimitRequest(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    const { environment, operation, rootAddress, blockLookbackNum } = content

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
                const townFactoryAddress = contractAddress(network, 'SpaceFactory')
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
                const restricted = await checkMintKVOverrides(rootAddress, env)
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

router.post('/api/sponsor-userop', async (request: WorkerRequest, env: Env) => {
    if (env.REFUSE_ALL_OPS === 'true') {
        return new Response(toJson({ error: 'User operations are not available' }), { status: 503 })
    }
    // check payload is IUserOperation with townId
    const content = await getContentAsJson(request)
    if (!content || !isTownsUserOperation(content)) {
        return new Response(toJson({ error: 'Bad Request' }), { status: 400 })
    }
    // check town is associated with paymaster
    const { townId, functionHash, rootKeyAddress, ...userOperation } = content
    // depending on the function hash, validate the content
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
            // todo: functionHash should be a keccak hash of the function signature
            case 'createSpace': {
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyCreateSpace({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
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
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!townId) {
                    return new Response(
                        toJson({ error: `Missing townId, cannot verify that town exists` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyJoinTown({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
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
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyLinkWallet({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
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
            case 'createRole':
            case 'removeRole':
            case 'updateRole':
            case 'addRoleToChannel':
            case 'removeRoleFromChannel':
            case 'removeEntitlementModule':
            case 'addEntitlementModule':
            case 'createChannel':
            case 'updateChannel':
            case 'removeChannel':
            case 'ban':
            case 'unban': {
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
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
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
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
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
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
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
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
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verificationLink = await verifyLinkWallet({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
                        functionHash: 'linkCallerToRootKey',
                        env,
                    })
                    const verificationCreate = await verifyCreateSpace({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
                        env,
                    })

                    if (!verificationLink.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verificationLink.error}` }),
                            {
                                status: 401,
                            },
                        )
                    }
                    if (!verificationCreate.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verificationCreate.error}` }),
                            {
                                status: 401,
                            },
                        )
                    }
                }
                break
            }
            case 'joinSpace_linkWallet': {
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
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
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verificationLink = await verifyLinkWallet({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
                        functionHash: 'linkCallerToRootKey',
                        env,
                    })
                    const verificationJoin = await verifyJoinTown({
                        rootKeyAddress: rootKeyAddress,
                        senderAddress: userOperation.sender,
                        townId: townId,
                        env,
                    })
                    if (!verificationLink.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verificationLink.error}` }),
                            {
                                status: 401,
                            },
                        )
                    }
                    if (!verificationJoin.verified) {
                        return new Response(
                            toJson({ error: `Unauthorized: ${verificationJoin.error}` }),
                            {
                                status: 401,
                            },
                        )
                    }
                }
                break
            }
            case 'editMembershipSettings': {
                if (!isHexString(rootKeyAddress)) {
                    return new Response(
                        toJson({ error: `rootKeyAddress ${rootKeyAddress} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!isHexString(userOperation.sender)) {
                    return new Response(
                        toJson({ error: `userOperation.sender ${userOperation.sender} not valid` }),
                        {
                            status: 400,
                        },
                    )
                }
                if (!townId) {
                    return new Response(
                        toJson({ error: `Missing townId, cannot verify town exists` }),
                        {
                            status: 400,
                        },
                    )
                }

                const makeCheckPromise = (promise: Promise<IVerificationResult>) => {
                    const controller = new AbortController()
                    const { signal } = controller

                    const p = new Promise<IVerificationResult>((resolve, reject) => {
                        signal.addEventListener('abort', () => {
                            reject(new Error('Aborted'))
                        })
                        promise
                            .then((val) => {
                                if (val.verified) {
                                    resolve(val)
                                } else {
                                    reject(val)
                                }
                            })
                            .catch((e) => {
                                reject({
                                    verified: false,
                                    error: e,
                                })
                            })
                    })

                    return {
                        promise: p,
                        abort: () => controller.abort(),
                    }
                }

                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    // editMembershipSettings can include various operations
                    // for now, if they fail any of the checks, they will be unauthorized, even if their batched user operation does not actually include data for that operation

                    const checks = [
                        // editing minter role
                        makeCheckPromise(
                            verifyUseTown({
                                rootKeyAddress: rootKeyAddress,
                                senderAddress: userOperation.sender,
                                townId: townId,
                                env,
                                transactionName: 'updateRole',
                            }),
                        ),

                        // editing membership supply
                        // skipped until  https://linear.app/hnt-labs/issue/HNT-5985/imembershipsol-events-should-have-msgsender
                        // makeCheckPromise(verifyMembershipChecks({
                        //     rootKeyAddress: rootKeyAddress,
                        //     senderAddress: userOperation.sender,
                        //     townId: townId,
                        //     env,
                        //     eventName: EventName.MembershipLimitUpdated
                        // })),

                        // editing membership price
                        // skipped until  https://linear.app/hnt-labs/issue/HNT-5985/imembershipsol-events-should-have-msgsender
                        // makeCheckPromise(verifyMembershipChecks({
                        //     rootKeyAddress: rootKeyAddress,
                        //     senderAddress: userOperation.sender,
                        //     townId: townId,
                        //     env,
                        //     eventName: EventName.MembershipPriceUpdated
                        // }))
                    ]

                    let verification: IVerificationResult = {
                        verified: false,
                    }

                    try {
                        await Promise.all(checks.map((c) => c.promise))
                        verification = {
                            verified: true,
                        }
                    } catch (err) {
                        console.error(`Verification error: ${JSON.stringify(err)}`)
                        verification = err as IVerificationResult
                        checks.forEach((p) => p.abort())
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
    // if so, fetch paymasterAndData from Stackup api
    const requestInit = createPmSponsorUserOperationRequest({
        userOperation,
        // PAYMASTER_ADDRESS is actually the entrypoint address and we need to change the name of this env var
        // https://linear.app/hnt-labs/issue/HNT-4569/change-paymaster-address-to-entrypoint-address-in-paymaster-proxy
        paymasterAddress: env.PAYMASTER_ADDRESS,
        type: { type: contextType },
    })
    console.log('stackup API request:', requestInit.body)
    const responseFetched = await fetch(`${STACKUP_API_URL}/${env.STACKUP_API_TOKEN}`, requestInit)
    if (responseFetched.status !== 200) {
        return new Response(toJson({ error: 'Invalid Paymaster Response' }), {
            status: responseFetched.status,
        })
    }
    const json = await responseFetched.json()
    if (!isPmSponsorUserOperationResponse(json)) {
        return new Response(toJson({ error: 'Invalid Paymaster Response' }), { status: 400 })
    }
    const statusCode = responseFetched.status
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
                    if (functionHash === 'editMembershipSettings') {
                        spaceDappError = spaceDapp.parseSpaceError(townId, json.error)
                        if (spaceDappError.name === UNKNOWN_ERROR) {
                            spaceDappError = spaceDapp.parsePrepayError(json.error)
                        }
                    } else {
                        spaceDappError = spaceDapp.parseSpaceError(townId, json.error)
                    }
                } else {
                    spaceDappError = spaceDapp.parseSpaceFactoryError(json.error)
                }
            }

            const spaceDappErrorMessage = `${spaceDappError?.message} ${spaceDappError?.name}`

            console.error(`stackup API returned error: ${json.error.code}, ${json.error.message}`)
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
        console.log('stackup API response:', json.result)
        return new Response(toJson(json.result), { status: 200 })
    }
    // proxy successful VerifyingPaymasterResult response to caller
})

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

export const handleRequest = (request: WorkerRequest, env: Env) => router.handle(request, env)

function toJson(data: object | undefined) {
    return JSON.stringify(data)
}
