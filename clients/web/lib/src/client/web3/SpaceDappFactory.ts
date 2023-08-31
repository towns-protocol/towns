import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDappV3 } from './v3/SpaceDappV3'
import { ethers } from 'ethers'

export function createSpaceDapp(
    chainId: number,
    provider: ethers.providers.Provider | undefined,
): ISpaceDapp {
    return new SpaceDappV3(chainId, provider)
}
