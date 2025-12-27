import { discoverAccount } from '../id/discoverAccount'
import { toSimpleSmartAccount } from './toSimpleSmartAccount'
import { toModularSmartAccount } from './toModularSmartAccount'
import type { Address, LocalAccount, PublicClient } from 'viem'
import type { SmartAccountType } from '../types'

/**
 * Creates a Towns Smart Account with automatic account type discovery
 *
 * This function will:
 * 1. Discover or use the forced address
 * 2. Detect if a modular or simple account is deployed
 * 3. Create the appropriate account implementation
 *
 * @param config - Configuration for the Towns smart account
 * @returns A viem SmartAccount ready for use with bundlers
 *
 * @example
 * ```ts
 * const account = await toTownsSmartAccount({
 *   client: publicClient,
 *   owner: localAccount,
 *   preferredType: 'modular', // optional, defaults to 'modular'
 * })
 *
 * console.log(account.address)
 * ```
 */
export async function toTownsSmartAccount(config: {
  client: PublicClient
  owner: LocalAccount
  preferredType?: SmartAccountType
  address?: Address
}) {
  const { client, owner, preferredType = 'modular', address: forceAddress } = config

  // Discover or use forced address
  const discovered = forceAddress
    ? { address: forceAddress, type: preferredType, deployed: false }
    : await discoverAccount(client, owner.address, preferredType)

  // Route to correct implementation based on discovered/preferred type
  return discovered.type === 'modular'
    ? await toModularSmartAccount({ client, owner, address: discovered.address })
    : await toSimpleSmartAccount({ client, owner, address: discovered.address })
}
