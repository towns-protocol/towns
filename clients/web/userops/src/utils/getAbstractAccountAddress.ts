import { Address } from '@river-build/web3'
import { getInitData } from '../workers'
import { ERC4337 } from '../constants'

export const abstractAddressMap = new Map<Address, Address>()

export async function getAbstractAccountAddress({
    rootKeyAddress,
    aaRpcUrl,
}: {
    rootKeyAddress: Address
    aaRpcUrl: string
}): Promise<Address | undefined> {
    if (abstractAddressMap.get(rootKeyAddress)) {
        return abstractAddressMap.get(rootKeyAddress)
    }

    // TODO: gonna have to figure out how to do this while migrating accounts to 0.7
    // internally this calls entyrpoint w/ initcode
    // so we probably need to determine what version of entrypoint this address is using
    const result = await getInitData({
        factoryAddress: ERC4337.SimpleAccount.Factory,
        signerAddress: rootKeyAddress,
        rpcUrl: aaRpcUrl,
    })

    abstractAddressMap.set(rootKeyAddress, result.addr)
    return result.addr
}
