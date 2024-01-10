import { isEthersProvider } from './Utils'
import { Versions, defaultVersion } from './ContractTypes'
import { UserOpSpaceDapp } from './v3/UserOpSpaceDapp'
import { UserOpSpaceDappConfig } from './UserOpTypes'
import { IUseropSpaceDapp } from './ISpaceDapp'

export function createSpaceDapp(
    args: Omit<UserOpSpaceDappConfig, 'rpcUrl'> & { rpcUrl?: string },
    version?: 'v3',
): IUseropSpaceDapp

export function createSpaceDapp(
    args: Omit<UserOpSpaceDappConfig, 'rpcUrl'> & { rpcUrl?: string },
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

        default:
            throw new Error('createSpaceDapp() not a valid version')
    }
}
