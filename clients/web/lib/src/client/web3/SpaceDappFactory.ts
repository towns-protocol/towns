import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDapp } from './SpaceDapp'
import { SpaceDappV3 } from './v3/SpaceDappV3'
import { ethers } from 'ethers'

export function createSpaceDapp(
    chainId: number,
    provider: ethers.providers.Provider | undefined,
    version?: string,
): ISpaceDapp {
    if (version === 'v3') {
        return new SpaceDappV3(chainId, provider)
    } else {
        return new SpaceDapp(chainId, provider)
    }
}
