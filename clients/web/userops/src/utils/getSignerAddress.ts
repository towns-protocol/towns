import { Address } from '@towns-protocol/web3'
import { Signer } from 'ethers'

export async function getSignerAddress(signer: Signer): Promise<Address> {
    const address = await signer.getAddress()
    return address as Address
}
