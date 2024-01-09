import { SpaceDapp as SpaceDappV4 } from './v4/SpaceDappV4'
import { isEthersProvider, isPublicClient } from './Utils'
import { TDefaultVersion, Versions, defaultVersion } from './ContractTypes'
import { UserOpSpaceDapp } from './v3/UserOpSpaceDapp'
import { UserOpSpaceDappConfig } from './UserOpTypes'
import { IUseropSpaceDapp } from './ISpaceDapp'

export function createSpaceDapp(
    args: Omit<UserOpSpaceDappConfig<'v3'>, 'rpcUrl'> & { rpcUrl?: string },
    version?: 'v3',
): IUseropSpaceDapp

export function createSpaceDapp(
    args: Omit<UserOpSpaceDappConfig<'v4'>, 'rpcUrl'> & { rpcUrl?: string },
    version?: 'v4',
): SpaceDappV4

export function createSpaceDapp<V extends Versions = TDefaultVersion>(
    args: Omit<UserOpSpaceDappConfig<V>, 'rpcUrl'> & { rpcUrl?: string },
    version: Versions = defaultVersion,
) {
    const { chainId, provider, rpcUrl, entryPointAddress, factoryAddress } = args
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    switch (version) {
        case 'v3': {
            if (isEthersProvider(provider)) {
                return new UserOpSpaceDapp({
                    chainId,
                    provider,
                    rpcUrl: rpcUrl ?? '',
                    entryPointAddress,
                    factoryAddress,
                }) as IUseropSpaceDapp
            }
            throw new Error("createSpaceDapp() 'v3' Provider is not an ethers provider")
        }
        case 'v4': {
            if (isPublicClient(provider)) {
                return new SpaceDappV4(chainId, provider)
            }
            throw new Error("createSpaceDapp() 'v3' Provider is not a viem PublicClient")
        }

        default:
            throw new Error('createSpaceDapp() not a valid version')
    }
}
