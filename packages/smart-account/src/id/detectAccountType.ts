import type { Address, PublicClient } from 'viem'
import type { SmartAccountType } from '../types'
import {
  EIP1967_IMPL_SLOT,
  SIMPLE_ACCOUNT_IMPL,
  MODULAR_ACCOUNT_IMPL,
  MODULAR_ACCOUNT_STORAGE,
} from '../constants'

export async function detectAccountType(
  client: PublicClient,
  address: Address,
): Promise<SmartAccountType | null> {
  const impl = await client.getStorageAt({
    address,
    slot: EIP1967_IMPL_SLOT,
  })
  if (!impl || impl === '0x') return null

  const implAddress = ('0x' + impl.slice(-40)) as Address

  if (implAddress.toLowerCase() === SIMPLE_ACCOUNT_IMPL.toLowerCase()) {
    return 'simple'
  }
  if (
    implAddress.toLowerCase() === MODULAR_ACCOUNT_IMPL.toLowerCase() ||
    implAddress.toLowerCase() === MODULAR_ACCOUNT_STORAGE.toLowerCase()
  ) {
    return 'modular'
  }
  return null
}
