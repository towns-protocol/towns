import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDapp } from './SpaceDapp'
import { SpaceDappV3 } from './v3/SpaceDappV3'
import { ethers } from 'ethers'

export function createSpaceDapp(
    chainId: number,
    provider: ethers.providers.Provider | undefined,
    version?: string,
): ISpaceDapp {
    version = version ?? process.env.SMART_CONTRACT_VERSION ?? ''
    console.log(`smart contract version "${version}"`)
    if (version === 'v3') {
        console.log('create SpaceDappV3')
        return new SpaceDappV3(chainId, provider)
    } else {
        console.log('create SpaceDapp')
        return new SpaceDapp(chainId, provider)
    }
}
