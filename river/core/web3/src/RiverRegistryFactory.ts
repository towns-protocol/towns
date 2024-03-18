import { isEthersProvider } from './Utils'
import { Versions, defaultVersion } from './ContractTypes'
import { SpaceDappConfig as DappConfig } from './SpaceDappTypes'
import { RiverRegistry } from './v3/RiverRegistry'

export function createRiverRegistry(
    args: DappConfig,
    version: Versions = defaultVersion,
): RiverRegistry {
    if (args.provider === undefined) {
        throw new Error('createRiverRegistry() Provider is undefined')
    }

    switch (version) {
        case 'v3': {
            if (isEthersProvider(args.provider)) {
                return new RiverRegistry(args.chainId, args.provider)
            }
            throw new Error("createRiverRegistry() 'v3' Provider is not an ethers provider")
        }
        default:
            throw new Error('createRiverRegistry() not a valid version')
    }
}
