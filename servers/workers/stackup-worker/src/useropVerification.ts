import { Env } from '.'
import { createSpaceDappForNetwork, networkMap } from './provider'
import { isErrorType } from 'worker-common'
import { BigNumber } from 'ethers'
import {
    EventByMethod,
    NetworkBlocksPerDay,
    contractAddress,
    createFilterWrapper,
    runLogQuery,
} from './logFilter'
import {
    IVerificationResult,
    checkjoinTownKVOverrides,
    checkLinkKVOverrides,
    checkMintKVOverrides,
    checkUseTownKVOverrides,
} from './checks'
import { isPrivyApiSearchResponse, searchPrivyForUser } from './privy'
import { ContractName, EventName, FunctionName } from './types'

interface ITownTransactionParams {
    rootKeyAddress: `0x${string}`
    senderAddress: `0x${string}`
    townId: string
    env: Env
}

// default transaction limits barring more restrictive
// criteria set via KV overrides
// note: joining a town has no limits by default
// see: https://linear.app/hnt-labs/issue/HNT-2477/deploy-paymaster-backend
export const TRANSACTION_LIMIT_DEFAULTS_PER_DAY = {
    createSpace: 3,
    roleSet: 20,
    entitlementSet: 20,
    channelCreate: 10,
    linkWallet: 10,
    updateSpaceInfo: 10,
    banUnban: 10,
    prepayMembership: 10,
}

/* Verifies if a user can create a town

   Verification criteria in order:
   1. townId must not exist AND
   2. check if more restrictive rule is enabled; if so,
      any address created by an email address on an HNT whitelist
	  can mint 3 towns / day
   3. if more restrictive rule not enabled, default rule; any wallet in
      HNT Labs Privy DB can mint 3 towns/day with no gas
*/
export async function verifyCreateSpace(
    params: Omit<ITownTransactionParams, 'townId'>,
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check for whitelist overrides for user, email associated with privy account
        // checks against Privy and so should the rootKeyAddress
        const isOverride = await checkMintKVOverrides(params.rootKeyAddress, params.env)
        if (isOverride == null) {
            return { verified: false, error: 'user not allowed to mint towns with paymaster' }
        }

        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }
        const townFactoryAddress = contractAddress(network, 'SpaceFactory')
        // check that quota has not been breached on-chain
        const queryResult = await runLogQuery(
            params.env.ENVIRONMENT,
            network,
            params.env,
            'SpaceOwner',
            'Transfer',
            [townFactoryAddress, params.senderAddress],
            createFilterWrapper,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )
        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for create town' }
        }

        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return { verified: true, maxActionsPerDay: 1_000_000 }
        }

        if (queryResult.events.length >= TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createSpace) {
            return { verified: false, error: 'user has reached max mints' }
        }
        return { verified: true, maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createSpace }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

/* Verifies if a user can join a town

   Verification criteria in order:
   1.( townId must exist AND
   2. user does not already have membership token AND
   3. user's wallet address is in privy db AND
   4. membership fee == 0 AND
   5. membership tokens still available to claim )
   OR
   1. if more restrictive whitelist criteria is enabled,
   2. townId must be on whitelist to allow to mint with paymaster
   3. criteria 1,2,3,4,5 still apply
*/
export async function verifyJoinTown(params: ITownTransactionParams): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }
    try {
        // check if town does not already exist
        console.log(spaceDapp.config.chainId, params, await spaceDapp.provider?.getNetwork())
        const spaceInfo = await spaceDapp.getSpaceInfo(params.townId)
        if (!spaceInfo) {
            return { verified: false, error: `Town ${params.townId} does not exist` }
        }
        // check if user is in privy db
        // check if wallet is signed up with privy
        const searchParam = { walletAddresses: [params.rootKeyAddress] }
        const privyResponse = await searchPrivyForUser(searchParam, params.env)
        if (!isPrivyApiSearchResponse(privyResponse)) {
            return { verified: false, error: 'not a privy response' }
        }
        if (privyResponse.data.length === 0) {
            return { verified: false, error: 'user not in privy db' }
        }
        // check for more restrictive rule and if town is on whitelist if so
        const override = await checkjoinTownKVOverrides(params.townId, params.env)
        if (override?.verified === false) {
            return { verified: false, error: 'townId not on whitelist and restriction is set' }
        }
        // check if user already has membership token
        const hasMembershipToken = await spaceDapp.hasSpaceMembership(
            params.townId,
            params.rootKeyAddress,
        )
        if (hasMembershipToken) {
            return { verified: false, error: `User already has membership token for town` }
        }
        // check if membership fee == 0
        const { maxSupply, price } = await spaceDapp.getMembershipInfo(params.townId)
        // we don't sponsor joinTown gas for towns with membership tokens with a price greater than zero
        if (maxSupply === 0 || price > BigNumber.from(0)) {
            return {
                verified: false,
                error: 'max supply zero or membership token price greater than zero',
            }
        }
        // 5. check if membership tokens still available to claim
        const { totalSupply: membershipSupply } = await spaceDapp.getMembershipSupply(params.townId)
        if (membershipSupply <= 0) {
            return { verified: false, error: 'membership supply is depleted' }
        }
        // todo: check all linked wallets for entitlement through xchain ?
        /*
		const isRootEntitled = await spaceDapp.isEntitledToSpace(
			params.townId,
			params.rootKeyAddress,
			Permission.JoinSpace,
		)
		const walletLink = spaceDapp.getWalletLink()
		const linkedWallets = await walletLink.getLinkedWallets(params.rootKeyAddress)
		const linkedEntitlements = linkedWallets.map((linkedWallet) => {
			return spaceDapp.isEntitledToSpace(params.townId, linkedWallet, Permission.JoinSpace)
		})
		const anyLinkedWalletEntitled = await Promise.any(linkedEntitlements)
		if (!isRootEntitled && !anyLinkedWalletEntitled) {
			return {
				verified: false,
				error: 'user and users linked wallets not entitled to join town',
			}
		}
		*/
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
    return {
        verified: true,
    }
}

/* Verifies if a user can use a town
   Using a Town

    Default:

    Roles can be changed / Entitlements set for a valid Town: 20 times / day

    Channels can be created for a valid town 10 times / day

    More Restrictive:

    Only Towns on HNT Labs curated whitelist can perform these 2 actions
*/
export async function verifyUseTown(
    params: ITownTransactionParams & { transactionName: FunctionName },
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check if town does not already exists
        try {
            const spaceInfo = await spaceDapp.getSpaceInfo(params.townId)
            if (!spaceInfo) {
                return { verified: false, error: `Town ${params.townId} does not exists` }
            }
        } catch (error) {
            console.error(error)
        }
        // check for restrictive rule which requires whitelist overrides for town
        const isOverride = await checkUseTownKVOverrides(params.rootKeyAddress, params.env)
        if (isOverride !== null && isOverride.verified === false) {
            return { verified: false, error: 'town not allowed to use channels with paymaster' }
        }

        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }

        const eventName = EventByMethod.get(params.transactionName)
        if (!eventName) {
            throw new Error(
                `Unknown transactionName for channel usage transactions: ${params.transactionName}`,
            )
        }

        // check that quota has not been breached on-chain
        const queryResult = await runLogQuery(
            params.env.ENVIRONMENT,
            network,
            params.env,
            mapTransactionNameToContractName(params.transactionName),
            eventName,
            // all we case about is conditioning the log query on msg.sender, which is AA
            [params.senderAddress, null],
            createFilterWrapper,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )
        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for use town' }
        }

        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return {
                verified: true,
                maxActionsPerDay: 1_000_000,
            }
        }

        let maxActionsPerDay: number | null = null
        switch (params.transactionName) {
            case 'createChannel':
            case 'updateChannel':
            case 'removeChannel':
                maxActionsPerDay = TRANSACTION_LIMIT_DEFAULTS_PER_DAY.channelCreate
                break
            case 'createRole':
            case 'removeRole':
            case 'updateRole':
            case 'removeRoleFromChannel':
            case 'addRoleToChannel':
                maxActionsPerDay = TRANSACTION_LIMIT_DEFAULTS_PER_DAY.roleSet
                break
            case 'removeEntitlementModule':
            case 'addEntitlementModule':
                maxActionsPerDay = TRANSACTION_LIMIT_DEFAULTS_PER_DAY.entitlementSet
                break
            case 'ban':
            case 'unban':
                maxActionsPerDay = TRANSACTION_LIMIT_DEFAULTS_PER_DAY.banUnban
                break
            default:
                maxActionsPerDay = null
                break
        }
        if (!maxActionsPerDay) {
            return { verified: false, error: `transaction not supported ${params.transactionName}` }
        }
        if (queryResult.events.length >= maxActionsPerDay) {
            return { verified: false, error: 'user has reached max mints' }
        }
        return {
            verified: true,
            maxActionsPerDay: maxActionsPerDay,
        }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

export async function verifyUpdateSpaceInfo(
    params: ITownTransactionParams & { transactionName: FunctionName },
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check if town does not already exists
        let spaceInfo: Awaited<ReturnType<typeof spaceDapp.getSpaceInfo>>
        try {
            spaceInfo = await spaceDapp.getSpaceInfo(params.townId)
            if (!spaceInfo) {
                return { verified: false, error: `Town ${params.townId} does not exists` }
            }
        } catch (error) {
            console.error(error)
            return { verified: false, error: `Town ${params.townId} does not exists` }
        }
        // check for restrictive rule which requires whitelist overrides for town
        const isOverride = await checkUseTownKVOverrides(params.rootKeyAddress, params.env)
        if (isOverride !== null && isOverride.verified === false) {
            return {
                verified: false,
                error: 'town not allowed to update space with paymaster',
            }
        }

        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }

        const eventName = EventByMethod.get(params.transactionName)
        if (!eventName) {
            throw new Error(
                `Unknown transactionName for usage transactions: ${params.transactionName}`,
            )
        }

        // check that quota has not been breached on-chain
        const queryResult = await runLogQuery(
            params.env.ENVIRONMENT,
            network,
            params.env,
            mapTransactionNameToContractName(params.transactionName),
            eventName,
            // TODO: should be spaceInfo.address but SpaceOwner__UpdateSpace(town_address) says its indexed but its not? This only passes with null
            [null],
            createFilterWrapper,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )
        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for update space' }
        }

        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return {
                verified: true,
                maxActionsPerDay: 1_000_000,
            }
        }

        let maxActionsPerDay: number | null = null
        switch (params.transactionName) {
            case 'updateSpaceInfo':
                maxActionsPerDay = TRANSACTION_LIMIT_DEFAULTS_PER_DAY.updateSpaceInfo
                break
            default:
                maxActionsPerDay = null
                break
        }
        if (!maxActionsPerDay) {
            return { verified: false, error: `transaction not supported ${params.transactionName}` }
        }
        if (queryResult.events.length >= maxActionsPerDay) {
            return { verified: false, error: 'user has reached max mints' }
        }
        return {
            verified: true,
            maxActionsPerDay: maxActionsPerDay,
        }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

function mapTransactionNameToContractName(transactionName: FunctionName): ContractName {
    switch (transactionName) {
        case 'updateSpaceInfo':
            return 'SpaceOwner'
        case 'createChannel':
        case 'updateChannel':
        case 'removeChannel':
            return 'Channels'
        case 'createRole':
        case 'removeRole':
        case 'updateRole':
            return 'Roles'
        case 'ban':
        case 'unban':
            return 'Banning'
        default:
            throw new Error('Unknown transactionName, cannot map to contract name')
    }
}

/* Verifies if a user can link an external wallet

   Verification criteria in order:
   1. user must have a linked wallet quota available (10/day max)
   OR 
   1. if more restrictive whitelist criteria is enabled,
   2. user address must also be on whitelist to link
*/
export async function verifyLinkWallet(
    params: Omit<ITownTransactionParams, 'townId'> & {
        functionHash: 'linkWalletToRootKey' | 'linkCallerToRootKey' | 'removeLink'
    },
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check for restrictive rule which requires whitelist overrides for user address
        const verification = await checkLinkKVOverrides(params.rootKeyAddress, params.env)
        if (verification !== null) {
            if (verification.verified === false) {
                return { verified: false, error: verification.error }
            }
        }
        // check max quota not exhausted
        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }

        let queryResult: Awaited<ReturnType<typeof runLogQuery>> | undefined

        if (params.functionHash === 'linkCallerToRootKey') {
            // https://linear.app/hnt-labs/issue/HNT-5664/event-for-linkcallertorootkey
            // linking smart Account to rootKey
            // no event to filter on ATM
            return {
                verified: true,
                maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.linkWallet,
            }
        }

        switch (params.functionHash) {
            case 'linkWalletToRootKey':
                // linking EOAs
                queryResult = await runLogQuery(
                    params.env.ENVIRONMENT,
                    network,
                    params.env,
                    'WalletLink',
                    'LinkWalletToRootKey',
                    [null, params.rootKeyAddress],
                    createFilterWrapper,
                    NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
                )
                break
            case 'removeLink':
                queryResult = await runLogQuery(
                    params.env.ENVIRONMENT,
                    network,
                    params.env,
                    'WalletLink',
                    'RemoveLink',
                    [null, params.rootKeyAddress],
                    createFilterWrapper,
                    NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
                )
                break
            default:
                throw new Error('Unknown functionHash for wallet linking')
        }

        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for wallet linking' }
        }
        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return {
                verified: true,
                maxActionsPerDay: 1_000_000,
            }
        }
        if (queryResult.events.length >= TRANSACTION_LIMIT_DEFAULTS_PER_DAY.linkWallet) {
            return { verified: false, error: 'user has reached max wallet links for the day' }
        }
        return { verified: true, maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.linkWallet }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

export async function verifyPrepaid(params: ITownTransactionParams): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check for restrictive rule which requires whitelist overrides for user address
        const verification = await checkLinkKVOverrides(params.rootKeyAddress, params.env)
        if (verification !== null) {
            if (verification.verified === false) {
                return { verified: false, error: verification.error }
            }
        }
        // check max quota not exhausted
        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }

        const space = spaceDapp.getSpace(params.townId)
        if (!space) {
            return { verified: false, error: 'Unable to get space for prepay membership' }
        }

        const queryResult = await runLogQuery(
            params.env.ENVIRONMENT,
            network,
            params.env,
            'Prepay',
            'PrepayBase__Prepaid',
            [space.Membership.address, null],
            createFilterWrapper,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )

        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for prepay memberships' }
        }
        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return {
                verified: true,
                maxActionsPerDay: 1_000_000,
            }
        }
        if (queryResult.events.length >= TRANSACTION_LIMIT_DEFAULTS_PER_DAY.prepayMembership) {
            return {
                verified: false,
                error: 'user has reached max prepay membership operations for the day',
            }
        }
        return {
            verified: true,
            maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.prepayMembership,
        }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

export async function verifyMembershipChecks(
    params: ITownTransactionParams & {
        eventName: 'MembershipLimitUpdated' | 'MembershipPriceUpdated'
    },
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check for restrictive rule which requires whitelist overrides for user address
        const verification = await checkLinkKVOverrides(params.rootKeyAddress, params.env)
        if (verification !== null) {
            if (verification.verified === false) {
                return { verified: false, error: verification.error }
            }
        }
        // check max quota not exhausted
        const network = networkMap.get(params.env.ENVIRONMENT)
        if (!network) {
            throw new Error(`Unknown environment network: ${params.env.ENVIRONMENT}`)
        }

        const space = spaceDapp.getSpace(params.townId)
        if (!space) {
            return { verified: false, error: 'Unable to get space for prepay membership' }
        }

        const queryResult = await runLogQuery(
            params.env.ENVIRONMENT,
            network,
            params.env,
            'Membership',
            params.eventName,
            // TODO: these events should be indexed by sender
            // https://linear.app/hnt-labs/issue/HNT-5985/imembershipsol-events-should-have-msgsender
            [params.senderAddress, null],
            createFilterWrapper,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )

        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter for prepay memberships' }
        }
        if (params.env.SKIP_LIMIT_VERIFICATION === 'true') {
            return {
                verified: true,
                maxActionsPerDay: 1_000_000,
            }
        }
        if (queryResult.events.length >= TRANSACTION_LIMIT_DEFAULTS_PER_DAY.prepayMembership) {
            return {
                verified: false,
                error: 'user has reached max prepay membership operations for the day',
            }
        }
        return {
            verified: true,
            maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.prepayMembership,
        }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}
