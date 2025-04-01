import { Address } from '@towns-protocol/web3'
import { determineSmartAccount } from '../lib/permissionless/accounts/determineSmartAccount'
import { SmartAccountType } from '../types'
export const abstractAddressMap = new Map<Address, Address>()

export async function getAbstractAccountAddress({
    rootKeyAddress,
    newAccountImplementationType,
    paymasterProxyUrl,
    paymasterProxyAuthSecret,
}: {
    rootKeyAddress: Address
    aaRpcUrl: string
    newAccountImplementationType: SmartAccountType
    paymasterProxyUrl: string
    paymasterProxyAuthSecret: string
}): Promise<Address | undefined> {
    const result = await determineSmartAccount({
        ownerAddress: rootKeyAddress,
        newAccountImplementationType,
        paymasterProxyUrl,
        paymasterProxyAuthSecret,
    })
    return result.address
}
