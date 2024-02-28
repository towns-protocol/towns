import { ethers } from 'ethers'
import { Address } from './web3-types'

export function getAccountAddress(userId: string): Address | undefined {
    //TODO: open question if it is a good approach - discuss with the team.
    //Current usecase - we need only accountAddress only (so chain id is not needed for River case)
    if (ethers.utils.isAddress(userId)) {
        return userId as Address
    }
    return undefined
}
