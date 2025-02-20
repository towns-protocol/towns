import { SpaceDapp } from '@river-build/web3'

import { Address } from '@river-build/web3'
import { getInitData } from '../workers'

export const abstractAddressMap = new Map<Address, Address>()

export async function getAbstractAccountAddress({
    rootKeyAddress,
    factoryAddress,
    entryPointAddress,
    spaceDapp,
    aaRpcUrl,
}: {
    rootKeyAddress: Address
    factoryAddress: string | undefined
    entryPointAddress: string | undefined
    spaceDapp: SpaceDapp | undefined
    aaRpcUrl: string
}): Promise<Address | undefined> {
    if (abstractAddressMap.get(rootKeyAddress)) {
        return abstractAddressMap.get(rootKeyAddress)
    }

    if (!factoryAddress) {
        throw new Error('factoryAddress is required')
    }
    if (!entryPointAddress) {
        throw new Error('entryPointAddress is required')
    }
    if (!spaceDapp?.provider) {
        throw new Error('spaceDapp is required')
    }
    const result = await getInitData({
        factoryAddress,
        signerAddress: rootKeyAddress,
        rpcUrl: aaRpcUrl,
    })

    abstractAddressMap.set(rootKeyAddress, result.addr)
    return result.addr
}
