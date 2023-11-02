import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDapp as SpaceDappV3 } from './v3/SpaceDapp'
import { ethers } from 'ethers'

export function createSpaceDapp(
    chainId: number,
    provider: ethers.providers.Provider | undefined,
): ISpaceDapp {
    return new SpaceDappV3(chainId, provider)
}
