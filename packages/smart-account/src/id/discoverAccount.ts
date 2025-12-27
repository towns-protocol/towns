import type { Address, PublicClient } from 'viem'
import type { SmartAccountType } from '../types'
import { simpleFactoryAbi, modularFactoryAbi } from '../abis'
import { SIMPLE_ACCOUNT_FACTORY, MODULAR_ACCOUNT_FACTORY } from '../constants'


export async function discoverAccount(
  client: PublicClient,
  owner: Address,
  preferredType: SmartAccountType = 'modular',
): Promise<{ address: Address, type: SmartAccountType, deployed: boolean }> {
  const [simpleAddr, modularAddr] = await Promise.all([
 client.readContract({
        address: SIMPLE_ACCOUNT_FACTORY,
        abi: simpleFactoryAbi,
        functionName: 'getAddress',
        args: [owner, 0n],
      })
      ,
      client.readContract({
        address: MODULAR_ACCOUNT_FACTORY,
        abi: modularFactoryAbi,
        functionName: 'getAddressSemiModular',
        args: [owner, 0n],
      })
  ])

  const [simpleCode, modularCode] = await Promise.all([
    client.getCode({ address: simpleAddr }),
    client.getCode({ address: modularAddr }),
  ])

  if (modularCode && modularCode !== '0x') {
    return { address: modularAddr, type: 'modular', deployed: true }
  }
  if (simpleCode && simpleCode !== '0x') {
    return { address: simpleAddr, type: 'simple', deployed: true }
  }

  return {
    address: preferredType === 'modular' ? modularAddr : simpleAddr,
    type: preferredType,
    deployed: false,
  }
}
