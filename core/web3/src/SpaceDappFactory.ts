import { isEthersProvider } from './Utils'
import { Versions, defaultVersion } from './ContractTypes'
import { SpaceDappConfig } from './SpaceDappTypes'
import { SpaceDapp } from './v3'
import { ISpaceDapp } from './ISpaceDapp'

export function createSpaceDapp(args: SpaceDappConfig, version?: 'v3'): ISpaceDapp

export function createSpaceDapp(args: SpaceDappConfig, version: Versions = defaultVersion) {
    if (args.provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }

    switch (version) {
        case 'v3': {
            if (isEthersProvider(args.provider)) {
                return new SpaceDapp({
                    ...args,
                }) as ISpaceDapp
            }
            throw new Error("createSpaceDapp() 'v3' Provider is not an ethers provider")
        }

        default:
            throw new Error('createSpaceDapp() not a valid version')
    }
}
