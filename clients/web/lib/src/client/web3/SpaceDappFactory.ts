import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDappV3 } from './v3/SpaceDappV3'
import { ethers } from 'ethers'

export function createSpaceDapp(
    chainId: number,
    provider: ethers.providers.Provider | undefined,
    version?: string,
): ISpaceDapp {
    version = version ?? process.env.SMART_CONTRACT_VERSION ?? ''
    console.log(`smart contract version "${version}"`)
    return new SpaceDappV3(chainId, provider)
}
