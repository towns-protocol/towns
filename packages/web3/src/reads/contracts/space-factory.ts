import { Abi, Address, getContract } from 'viem'
import { ReadClient } from '../clients/readClient'
import WalletLinkAbi from '@towns-protocol/generated/dev/abis/WalletLink.abi'
import PricingModuleAbi from '@towns-protocol/generated/dev/abis/IPricingModules.abi'
import PlatformRequirementsAbi from '@towns-protocol/generated/dev/abis/PlatformRequirementsFacet.abi'
import { ContractInstance } from './types'

export type SpaceFactoryReads = {
    walletLink: ContractInstance<typeof WalletLinkAbi>
    pricingModules: ContractInstance<typeof PricingModuleAbi>
    platformRequirements: ContractInstance<typeof PlatformRequirementsAbi>
}

export function makeSpaceFactoryReads(args: {
    spaceFactoryAddress: Address
    publicClient: ReadClient
}): SpaceFactoryReads {
    const { spaceFactoryAddress, publicClient } = args
    const makeInstance = <Abi_ extends Abi>(abi: Abi_) =>
        getContract({
            address: spaceFactoryAddress,
            abi,
            client: {
                public: publicClient,
            },
        })
    return {
        walletLink: makeInstance(WalletLinkAbi),
        pricingModules: makeInstance(PricingModuleAbi),
        platformRequirements: makeInstance(PlatformRequirementsAbi),
    }
}
