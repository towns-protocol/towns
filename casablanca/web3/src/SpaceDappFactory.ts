import { PublicClient } from 'viem'
import { ISpaceDapp } from './ISpaceDapp'
import { SpaceDapp as SpaceDappV3 } from './v3/SpaceDapp'
import { SpaceDapp as SpaceDappV4 } from './v4/SpaceDappV4'
import { ethers } from 'ethers'
import { isEthersProvider, isPublicClient } from './Utils'
import { TDefaultVersion, Versions, defaultVersion } from './ContractTypes'

type ProviderType<V extends Versions = TDefaultVersion> = V extends 'v3'
    ? ethers.providers.Provider
    : PublicClient

export function createSpaceDapp<V extends Versions = TDefaultVersion>(
    chainId: number,
    provider: ProviderType<V> | undefined,
    version: Versions = defaultVersion,
): ISpaceDapp<typeof version> {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    switch (version) {
        case 'v3': {
            if (isEthersProvider(provider)) {
                return new SpaceDappV3(chainId, provider) as ISpaceDapp<'v3'>
            }
            throw new Error("createSpaceDapp() 'v3' Provider is not an ethers provider")
        }
        case 'v4': {
            if (isPublicClient(provider)) {
                return new SpaceDappV4(chainId, provider) as ISpaceDapp<'v4'>
            }
            throw new Error("createSpaceDapp() 'v3' Provider is not a viem PublicClient")
        }

        default:
            throw new Error('createSpaceDapp() not a valid version')
    }
}
