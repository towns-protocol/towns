import { Env } from '.'
import { isPrivyApiSearchResponse, searchPrivyForUserByDid, verifyPrivyAuthToken } from './privy'
import { Overrides, isWhitelistStoredOperation, IOverrideOperation } from './types'
import { TRANSACTION_LIMIT_DEFAULTS_PER_DAY } from './useropVerification'
import { durationLogger } from './utils'
//import { Permission } from '@river-build/web3'

export interface IVerificationResult {
    verified: boolean
    maxActionsPerDay?: number
    error?: string
}

// Type guard for IEveryWalletCanMint
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isOperationOverride(obj: any): obj is IOverrideOperation {
    return (
        typeof obj === 'object' &&
        'operation' in obj &&
        'enabled' in obj &&
        typeof obj.enabled === 'boolean' &&
        typeof obj.operation === 'string'
    )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isEveryWalletCanMintNTimes(obj: any): obj is IOverrideOperation {
    return (
        typeof obj === 'object' &&
        'operation' in obj &&
        typeof obj.operation === 'string' &&
        'n' in obj &&
        typeof obj.n === 'number'
    )
}

// check restriction rule and if wallet is on whitelist if rule set
export async function checkLinkKVOverrides(
    rootAddress: string,
    env: Env,
): Promise<IVerificationResult | null> {
    // check if wallet associated with a privy user can link
    const restriction = await env.OVERRIDES.get(Overrides.EveryWhitelistedWalletCanLinkNWallets, {
        type: 'json',
        cacheTtl: 3600,
    })

    if (restriction !== null && isOperationOverride(restriction) && restriction.enabled) {
        // check if address on HNT whitelist
        const addressWhitelist = await env.ADDRESS_WHITELIST.get(rootAddress ?? '', {
            type: 'json',
            cacheTtl: 3600,
        })
        if (
            isWhitelistStoredOperation(addressWhitelist) &&
            addressWhitelist.data === rootAddress &&
            addressWhitelist.enabled
        ) {
            return {
                verified: true,
                maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.linkWallet,
            }
        }
        return { verified: false, error: 'address is not on whitelist' }
    }
    return {
        verified: true,
        maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.linkWallet,
    }
}

// check for restrictive rule on using a town
export async function checkUseTownKVOverrides(
    townId: string,
    env: Env,
): Promise<IVerificationResult | null> {
    // check if override is enabled
    const useTownWhitelist = await env.OVERRIDES.get(Overrides.EveryWalletCanUseTownOnWhitelist, {
        type: 'json',
        cacheTtl: 3600,
    })
    if (
        useTownWhitelist !== null &&
        isOperationOverride(useTownWhitelist) &&
        useTownWhitelist.enabled
    ) {
        // more restrictive rule: check if town is on whitelist
        const townWhitelist = await env.TOWN_WHITELIST.get(townId, {
            type: 'json',
            cacheTtl: 3600,
        })
        if (isWhitelistStoredOperation(townWhitelist)) {
            if (townWhitelist.data !== townId || !townWhitelist.enabled) {
                return { verified: false, error: `TownId is not on whitelist` }
            } else {
                return { verified: true }
            }
        }
        return { verified: false, error: `TownId is not on whitelist` }
    }
    return { verified: true }
}

// check for restrictive rule on join town
export async function checkjoinTownKVOverrides(
    townId: string,
    env: Env,
): Promise<IVerificationResult | null> {
    // check if override is enabled
    const joinTownWhitelist = await env.OVERRIDES.get(Overrides.EveryWalletCanJoinTownOnWhitelist, {
        type: 'json',
        cacheTtl: 3600,
    })
    if (
        joinTownWhitelist !== null &&
        isOperationOverride(joinTownWhitelist) &&
        joinTownWhitelist.enabled
    ) {
        // more restrictive rule: check if town is on whitelist
        const townWhitelist = await env.TOWN_WHITELIST.get(townId, {
            type: 'json',
            cacheTtl: 3600,
        })
        if (isWhitelistStoredOperation(townWhitelist)) {
            if (townWhitelist.data !== townId || !townWhitelist.enabled) {
                return { verified: false, error: `TownId is not on whitelist` }
            } else {
                return { verified: true }
            }
        }
        return { verified: false, error: `TownId is not on whitelist` }
    }
    return { verified: true }
}

export async function checkMintKVOverrides(
    rootAddress: string,
    privyDid: string,
    env: Env,
): Promise<IVerificationResult | null> {
    // more restrictive rule requires whitelisted email
    const emailOverrides = durationLogger('Overrides.EveryWalletCanMintWhitelistedEmail')
    const everyWalletCanMintWhitelistedEmail = await env.OVERRIDES.get(
        Overrides.EveryWalletCanMintWhitelistedEmail,
        {
            type: 'json',
            cacheTtl: 3600,
        },
    )
    emailOverrides()
    // check for whitelisted emails that are associated with privy users
    if (
        everyWalletCanMintWhitelistedEmail !== null &&
        isOperationOverride(everyWalletCanMintWhitelistedEmail) &&
        everyWalletCanMintWhitelistedEmail.enabled
    ) {
        const privyUser = await searchPrivyForUserByDid(privyDid, env)
        if (isPrivyApiSearchResponse(privyUser)) {
            const linkedAccounts = privyUser.linked_accounts.filter((account) => {
                return account.type.includes('_oauth')
            })

            const linkedDuration = durationLogger('linkedAccounts')
            for (const linkedAccount of linkedAccounts) {
                // search for associated emails and cross check against whitelist of emails
                const emailWhitelist = await env.EMAIL_WHITELIST.get(linkedAccount.email ?? '', {
                    type: 'json',
                    cacheTtl: 3600,
                })
                if (
                    isWhitelistStoredOperation(emailWhitelist) &&
                    emailWhitelist.data === linkedAccount.email &&
                    emailWhitelist.enabled
                ) {
                    console.log(
                        `user ${rootAddress}, email ${linkedAccount.email} is on email whitelist`,
                    )
                    linkedDuration()
                    return {
                        verified: true,
                        maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createSpace,
                    }
                }
            }
            linkedDuration()
            return {
                verified: false,
                error: 'user not on email whitelist',
            }
        }
    }
    // default criteria
    if (privyDid) {
        return { verified: true, maxActionsPerDay: 3 }
    }

    return null
}

export function checkKVLinkedWallets(
    linkedWallets: string[] | readonly `0x${string}`[],
    env: Env,
): IVerificationResult {
    for (const linkedWallet of linkedWallets) {
        const linkedWalletSponsored = env.CREATE_TOWN.get(linkedWallet)
        if (linkedWalletSponsored !== null) {
            return { verified: true }
        }
    }
    return { verified: false }
}
