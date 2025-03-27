import { Address } from '@towns-protocol/web3'
import { determineSmartAccount } from '../lib/permissionless/accounts/determineSmartAccount'
import { SmartAccountType } from '../types'
export const abstractAddressMap = new Map<Address, Address>()

export async function getAbstractAccountAddress({
    rootKeyAddress,
    aaRpcUrl,
    newAccountImplementationType,
}: {
    rootKeyAddress: Address
    aaRpcUrl: string
    newAccountImplementationType: SmartAccountType
}): Promise<Address | undefined> {
    const result = await determineSmartAccount({
        ownerAddress: rootKeyAddress,
        rpcUrl: aaRpcUrl,
        newAccountImplementationType,
    })
    return result.address
}
