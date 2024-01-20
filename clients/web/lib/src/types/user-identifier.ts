import { ethers } from 'ethers'

export function getAccountAddress(userId: string): string | undefined {
    //TODO: open question if it is a good approach - discuss with the team.
    //Current usecase - we need only accountAddress only (so chain id is not needed for River case)
    if (ethers.utils.isAddress(userId)) {
        return userId
    }
    return undefined
}
