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
} from './types'
import {
    TRANSACTION_LIMIT_DEFAULTS_PER_DAY,
    verifyCreateTown,
    verifyJoinTown,
    verifyLinkWallet,
} from './useropVerification'

import { isErrorType, Environment } from 'worker-common'
import { WorkerRequest, createPmSponsorUserOperationRequest, getContentAsJson } from './utils'
import { runLogQueryTownOwner } from './logFilter'
import { checkMintKVOverrides } from './checks'

// can be 'payg' or 'erc20token'
// see https://docs.stackup.sh/reference/pm-sponsoruseroperation
const contextType = 'payg'
// todo: move ot env var
export const STACKUP_API_URL = 'https://api.stackup.sh/v1/paymaster'

const router = Router()

/* Check transaction limits for a wallet
 *  Arguments:
 * - environment: Environment
 * - operation: "createTown" | "joinTown" | "linkWallet" | "useTown
 * - rootAddress: string
 * - blockLookbackNum (optional)
 *
 */
router.post('/api/transaction-limits', async (request: WorkerRequest, env: Env) => {
    // check payload is IUserOperation with townId
    const content = await getContentAsJson(request)
    if (!content || !isTransactionLimitRequest(content)) {
        return new Response('Bad Request', { status: 400 })
    }
    const { environment, operation, rootAddress, blockLookbackNum } = content

    try {
        switch (operation) {
            case 'createTown': {
                const queryResult = await runLogQueryTownOwner(
                    environment as Environment,
                    env,
                    'Transfer',
                    rootAddress,
                    blockLookbackNum,
                )
                if (!queryResult) {
                    return new Response('Internal Service Error', { status: 500 })
                }
                const restricted = await checkMintKVOverrides(rootAddress, env)
                return new Response(
                    JSON.stringify({
                        ...queryResult,
                        maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createTown,
                        restricted: !restricted?.verified,
                    }),
                    { status: 200 },
                )
            }
            case 'joinTown': {
                break
            }
            case 'linkWallet': {
                break
            }
            case 'useTown': {
                break
            }
            default:
                return new Response(`Unknown operation ${operation}`, { status: 404 })
        }
    } catch (error) {
        console.error(`returned error: ${isErrorType(error) ? error?.message : 'Unknown error'}`)
        return new Response('Internal Service Error', { status: 500 })
    }
})

router.post('/api/sponsor-userop', async (request: WorkerRequest, env: Env) => {
    // check payload is IUserOperation with townId
    const content = await getContentAsJson(request)
    if (!content || !isTownsUserOperation(content)) {
        return new Response('Bad Request', { status: 400 })
    }
    // check town is associated with paymaster
    const { townId, functionHash, ...userOperation } = content
    // depending on the function hash, validate the content
    try {
        /* createTown (TownArchitect.sol)
		/* joinTown (MembershipFacet.sol)
        */
        /* linkWalletToRootKey (WalletLink.sol)
          1. check if wallet is already linked
          2. check if wallet has any links left
          3. check total number of link actions per wallet
        */

        // todo: all other on-chain write functions exposed in app (see @river/web3 for list)
        switch (functionHash) {
            // todo: functionHash should be a keccak hash of the function signature
            case 'createTown': {
                if (!isHexString(userOperation.sender)) {
                    return new Response(`ender address ${userOperation.sender} not valid`, {
                        status: 400,
                    })
                }
                if (!townId) {
                    return new Response(`Missing townId, cannot verify that town does not exist`, {
                        status: 400,
                    })
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyCreateTown({
                        rootKeyAddress: userOperation.sender,
                        townId: townId,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(`Unauthorized: ${verification.error}`, { status: 401 })
                    }
                }
                break
            }
            case 'joinTown': {
                if (!isHexString(userOperation.sender)) {
                    return new Response(`ender address ${userOperation.sender} not valid`, {
                        status: 400,
                    })
                }
                if (!townId) {
                    return new Response(`Missing townId, cannot verify that town exists`, {
                        status: 400,
                    })
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyJoinTown({
                        rootKeyAddress: userOperation.sender,
                        townId: townId,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(`Unauthorized: ${verification.error}`, { status: 401 })
                    }
                }
                break
            }
            case 'linkWallet': {
                if (!isHexString(userOperation.sender)) {
                    return new Response(`ender address ${userOperation.sender} not valid`, {
                        status: 400,
                    })
                }
                if (env.SKIP_TOWNID_VERIFICATION !== 'true') {
                    const verification = await verifyLinkWallet({
                        rootKeyAddress: userOperation.sender,
                        env,
                    })
                    if (!verification.verified) {
                        return new Response(`Unauthorized: ${verification.error}`, { status: 401 })
                    }
                }
                break
            }
            default:
                return new Response(`Unknown functionHash ${functionHash}`, { status: 404 })
        }
    } catch (error) {
        console.error(`KV returned error: ${isErrorType(error) ? error?.message : 'Unknown error'}`)
        return new Response('Internal Service Error', { status: 500 })
    }
    // if so, fetch paymasterAndData from Stackup api
    const requestInit = createPmSponsorUserOperationRequest({
        userOperation,
        paymasterAddress: env.PAYMASTER_ADDRESS,
        type: { type: contextType },
    })
    if (env.ENVIRONMENT === 'development') {
        console.log('stackup API request:', requestInit.body)
    }
    const responseFetched = await fetch(`${STACKUP_API_URL}/${env.STACKUP_API_TOKEN}`, requestInit)
    if (responseFetched.status !== 200) {
        return new Response('Invalid Paymaster Response', { status: responseFetched.status })
    }
    const response = await responseFetched.json()
    if (!isPmSponsorUserOperationResponse(response)) {
        return new Response('Invalid Paymaster Response', { status: 400 })
    }
    const statusCode = responseFetched.status
    if (statusCode !== 200) {
        return new Response('Paymaster Error', {
            status: statusCode,
            statusText: `Error code ${response?.error?.code}, message ${response?.error?.message}`,
        })
    } else {
        if (response.error) {
            console.error(
                `stackup API returned error: ${response.error.code}, ${response.error.message}`,
            )
            return new Response('Internal Service Error', {
                status: 500,
                statusText: `Error code ${response.error.code}, message ${response.error.message}`,
            })
        }
        console.log('stackup API response:', response.result)
        return response
    }
    // proxy successful VerifyingPaymasterResult response to caller
})

router.post('/admin/api/add-override', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getContentAsJson(request)
    if (!content || !isOverrideOperation(content)) {
        return new Response('Bad Request', { status: 400 })
    }
    const { operation, enabled, n } = content
    switch (operation) {
        case Overrides.EveryWalletCanMintWhitelistedEmail: {
            // add to KV
            await env.OVERRIDES.put(
                operation,
                JSON.stringify({ operation: operation, enabled: enabled }),
            )
            break
        }
        case Overrides.EveryWalletCanLinkNWallets: {
            // add to KV
            await env.OVERRIDES.put(
                operation,
                JSON.stringify({ operation: operation, enabled: enabled, n: n }),
            )
            break
        }
        case Overrides.EveryWalletCanJoinTownOnWhitelist: {
            // add to KV
            await env.OVERRIDES.put(
                operation,
                JSON.stringify({ operation: operation, enabled: enabled }),
            )
            break
        }
        default:
            return new Response(`Unknown operation ${operation}`, { status: 404 })
    }
    return new Response('Ok', { status: 200 })
})

router.post('/admin/api/add-to-whitelist', async (request: WorkerRequest, env: Env) => {
    // authneticate and authorize caller here (HNT Labs)

    const content = await getContentAsJson(request)
    if (!content || !isWhitelistOperation(content)) {
        return new Response('Bad Request', { status: 400 })
    }
    const { operation, enabled, data } = content
    switch (operation) {
        case Whitelist.EmailWhitelist: {
            // add to KV
            // todo: check if email is valid
            await env.EMAIL_WHITELIST.put(data, JSON.stringify({ data: data, enabled: enabled }))
            break
        }
        case Whitelist.TownIdWhitelist: {
            // add to KV
            // todo: check if townId is conformant
            await env.TOWN_WHITELIST.put(data, JSON.stringify({ data: data, enabled: enabled }))
            break
        }
        default:
            return new Response(`Unknown operation ${operation}`, { status: 404 })
    }
    return new Response('Ok', { status: 200 })
})

router.get('*', () => new Response('Not Found', { status: 404 }))

export const handleRequest = (request: WorkerRequest, env: Env) => router.handle(request, env)
