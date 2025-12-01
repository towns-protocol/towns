import {
    Address,
    Hex,
    zeroAddress,
    type Account,
    type Chain,
    type Client,
    type Transport,
} from 'viem'
import { getStorageAt, readContract } from 'viem/actions'
import walletLinkAbi from '@towns-protocol/generated/dev/abis/WalletLink.abi'
import { Bot } from './bot'
import type { PlainMessage, SlashCommand } from '@towns-protocol/proto'

/**
 * The default slot for the implementation address for ERC-1967 Proxies
 * keccak256('eip1967.proxy.implementation')) - 1
 */
export const PROXY_STORAGE_SLOT =
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'

/**
 * Known modular account implementation addresses
 */
export const MODULAR_ACCOUNT_IMPLEMENTATIONS = {
    /**
     * Semi modular smart account bytecode for new accounts
     * New accounts get this address as their implementation
     */
    NEW: '0x000000000000c5A9089039570Dd36455b5C07383',
    /**
     * Storage only smart account bytecode for existing accounts
     * Upgraded accounts get this address as their implementation
     * https://github.com/alchemyplatform/modular-account/blob/develop/src/account/SemiModularAccountStorageOnly.sol
     */
    UPGRADED: '0x0000000000006E2f9d80CaEc0Da6500f005EB25A',
} as const

function isModularAccount(implementationAddress: Hex): boolean {
    const lowerImpl = implementationAddress.toLowerCase()
    return (
        lowerImpl === MODULAR_ACCOUNT_IMPLEMENTATIONS.NEW.toLowerCase() ||
        lowerImpl === MODULAR_ACCOUNT_IMPLEMENTATIONS.UPGRADED.toLowerCase()
    )
}

/**
 * Check if an address has a deployed modular smart account implementation
 * @param client - The public RPC viem client
 * @param address - The address to check
 * @returns True if the address has a deployed modular smart account implementation, false otherwise
 */
export async function checkSmartAccountImplementation(
    viem: Client<Transport, Chain, Account>,
    address: Address,
): Promise<boolean> {
    try {
        const storageValue = await getStorageAt(viem, {
            address,
            slot: PROXY_STORAGE_SLOT,
        })

        if (!storageValue) {
            return false
        }

        // The storage slot contains a full bytes32, but we want only the last 20 bytes.
        // Slice off the leading `0x` and the first 12 bytes (24 characters), leaving the last 20 bytes, then prefix with `0x`.
        const implementationAddress: Hex = `0x${storageValue.slice(26)}`
        if (implementationAddress === zeroAddress) {
            return false
        }
        // Only return modular accounts (skip simple accounts)
        if (!isModularAccount(implementationAddress)) {
            return false
        }
        return true
    } catch {
        return false
    }
}

async function getLinkedWalletsWithRootKey(
    viem: Client<Transport, Chain, Account>,
    wallet: Address,
    walletLinkAddress: Address,
) {
    try {
        const linkedWallets = await readContract(viem, {
            address: walletLinkAddress,
            abi: walletLinkAbi,
            functionName: 'getWalletsByRootKey',
            args: [wallet],
        })
        if (!linkedWallets) {
            const possibleRoot = await readContract(viem, {
                address: walletLinkAddress,
                abi: walletLinkAbi,
                functionName: 'getRootKeyForWallet',
                args: [wallet],
            })
            if (possibleRoot !== zeroAddress) {
                const possibleLinkedWallets = await readContract(viem, {
                    address: walletLinkAddress,
                    abi: walletLinkAbi,
                    functionName: 'getWalletsByRootKey',
                    args: [possibleRoot],
                })
                return [possibleRoot, ...possibleLinkedWallets]
            }
        }
        return linkedWallets
    } catch {
        return []
    }
}

/**
 * Get the deployed modular smart account for a userId (rootkey)
 * This function:
 * 1. Gets all linked wallets for the userId using the WalletLink contract
 * 2. Checks each wallet to see if it has a deployed modular smart account
 * 3. Returns the first modular smart account found, or null if none exist
 *
 * @param bot - The bot instance
 * @param params - User id
 * @returns The address of the deployed modular smart account, or null if none exists
 *
 * @example
 * ```typescript
 * import { getDeployedSmartAccount } from '@towns-protocol/bot'
 *
 * // Simple usage with bot instance
 * const address = await getDeployedSmartAccount(bot, userId)
 * ```
 */
export async function getSmartAccountFromUserId(
    bot: Bot<PlainMessage<SlashCommand>[]>,
    params: {
        userId: Address
    },
): Promise<Address | null> {
    const contractAddress = bot.client.config.base.chainConfig.addresses.spaceFactory
    return getSmartAccountFromUserIdImpl(contractAddress, bot.viem, params.userId)
}

export async function getSmartAccountFromUserIdImpl(
    contractAddress: Address,
    viem: Client<Transport, Chain, Account>,
    userId: Address,
): Promise<Address | null> {
    try {
        // Get all linked wallets for this user
        const linkedWallets = await getLinkedWalletsWithRootKey(viem, userId, contractAddress)
        // Check each wallet for a deployed modular smart account
        for (const address of linkedWallets) {
            const isModular = await checkSmartAccountImplementation(viem, address)
            if (isModular) {
                return address
            }
        }
        return null
    } catch {
        return null
    }
}
