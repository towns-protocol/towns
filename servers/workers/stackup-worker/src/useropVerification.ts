import { Env } from '.'
import { createSpaceDappForNetwork } from './provider'
import { isErrorType } from 'worker-common'
import { BigNumber } from 'ethers'
import { NetworkBlocksPerDay, runLogQueryTownOwner } from './logFilter'
import { IVerificationResult, checkJoinTownKVOverrides, checkMintKVOverrides } from './checks'

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
    createTown: 3,
    roleSet: 20,
    entitlementSet: 20,
    channelCreate: 10,
    linkWallet: 10,
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
export async function verifyCreateTown(
    params: ITownTransactionParams,
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check if town already exists
        try {
            const spaceInfo = await spaceDapp.getSpaceInfo(params.townId)
            if (spaceInfo) {
                return { verified: false, error: `Town ${params.townId} already exists` }
            }
        } catch (error) {
            console.error(error)
        }
        // check for whitelist overrides for user, email associated with privy account
        // checks against Privy and so should the rootKeyAddress
        const isOverride = await checkMintKVOverrides(params.rootKeyAddress, params.env)
        if (isOverride == null) {
            return { verified: false, error: 'user not allowed to mint towns with paymaster' }
        }
        // check that quota has not been breached on-chain
        // should use the senderAddress for this check as that is msg.sender
        const queryResult = await runLogQueryTownOwner(
            params.env.ENVIRONMENT,
            params.env,
            'Transfer',
            params.senderAddress,
            NetworkBlocksPerDay.get(params.env.ENVIRONMENT) ?? undefined,
        )
        if (!queryResult || !queryResult.events) {
            return { verified: false, error: 'Unable to queryFilter' }
        }
        if (queryResult.events.length >= TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createTown) {
            return { verified: false, error: 'user has reached max mints' }
        }
        return { verified: true, maxActionsPerDay: TRANSACTION_LIMIT_DEFAULTS_PER_DAY.createTown }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}

/* Verifies if a user can join a town

   Verification criteria in order:
   1. townId must exist AND
   2. user does not already have membership token
   3. membership fee == 0
   4. membership tokens still available to claim
   5. user entitled to join
   6. OR if more restrictive whitelist criteria is enabled,
   7. townId must be on whitelist to allow to mint with paymaster
   8. criteria 1,2,4,5 still apply
*/
export async function verifyJoinTown(params: ITownTransactionParams): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }
    try {
        // 1. check if town does not already exist
        const spaceInfo = await spaceDapp.getSpaceInfo(params.townId)
        if (!spaceInfo) {
            return { verified: false, error: `Town ${params.townId} does not exist` }
        }
        // 2. check if town is on whitelist if override enabled
        const override = await checkJoinTownKVOverrides(params.townId, params.env)
        if (override?.verified === false) {
            return { verified: false, error: 'townId not on whitelist and restriction is set' }
        }
        // 3. check if user already has membership token
        // todo: should we be checking all linked wallets or smart account for membership token?
        const hasMembershipToken = await spaceDapp.hasTownMembership(
            params.townId,
            params.rootKeyAddress,
        )
        if (hasMembershipToken) {
            return { verified: false, error: `User already has membership token for town` }
        }
        // 4. check if membership fee == 0
        const { maxSupply, price } = await spaceDapp.getMembershipInfo(params.rootKeyAddress)
        // we don't sponsor joinTown gas for towns with membership tokens with a price greater than zero
        if (maxSupply === 0 || price > BigNumber.from(0)) {
            return {
                verified: false,
                error: 'max supply zero or membership token price greater than zero',
            }
        }
        // 5. check if membership tokens still available to claim
        const { totalSupply: membershipSupply } = await spaceDapp.getMembershipSupply(
            params.rootKeyAddress,
        )
        if (membershipSupply <= 0) {
            return { verified: false, error: 'membership supply is depleted' }
        }
        // todo: check all linked wallets for entitlement through xchain ?
        /*
		const isRootEntitled = await spaceDapp.isEntitledToSpace(
			params.townId,
			params.rootKeyAddress,
			Permission.JoinTown,
		)
		const walletLink = spaceDapp.getWalletLink()
		const linkedWallets = await walletLink.getLinkedWallets(params.rootKeyAddress)
		const linkedEntitlements = linkedWallets.map((linkedWallet) => {
			return spaceDapp.isEntitledToSpace(params.townId, linkedWallet, Permission.JoinTown)
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

/* Verifies if a user can link an external wallet

   Verification criteria in order:
   1. user must exist in privy
   2. wallet linking override for n wallets must be enabled
   3. user must have a linked wallet quota available
*/
export async function verifyLinkWallet(
    params: Omit<ITownTransactionParams, 'townId'>,
): Promise<IVerificationResult> {
    const spaceDapp = await createSpaceDappForNetwork(params.env)
    if (!spaceDapp) {
        return { verified: false, error: 'Unable to create SpaceDapp' }
    }

    try {
        // check for whitelist overrides for user, email associated with privy account
        const override = await checkMintKVOverrides(params.rootKeyAddress, params.env)
        if (
            override !== null &&
            override.verified === true &&
            override.maxActionsPerDay &&
            override.maxActionsPerDay > 0
        ) {
            const walletLink = spaceDapp.getWalletLink()
            const linkedWallets = await walletLink.getLinkedWallets(params.rootKeyAddress)
            if (linkedWallets.length >= override.maxActionsPerDay) {
                return { verified: false, error: 'user has reached max linked wallets' }
            }
            return override
        }
        return { verified: false, error: 'user not allowed to link wallets' }
    } catch (error) {
        return {
            verified: false,
            error: isErrorType(error) ? error?.message : 'Unkown error',
        }
    }
}
