/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'

import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import { TokenEntitlementModule as Goerli_TokenEntitlementModule } from '@harmony/contracts/goerli/typings/TokenEntitlementModule'
import Goerli_TokenEntitlementModuleArtifact from '@harmony/contracts/goerli/abis/TokenEntitlementModule.json'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import { TokenEntitlementModule as Localhost_TokenEntitlementModule } from '@harmony/contracts/localhost/typings/TokenEntitlementModule'
import Localhost_TokenEntitlementModuleArtifact from '@harmony/contracts/localhost/abis/TokenEntitlementModule.json'

import { ethers } from 'ethers'

export class TokenEntitlementModuleShim extends BaseContractShim<
    Localhost_TokenEntitlementModule,
    Goerli_TokenEntitlementModule
> {
    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        chainId: number,
    ) {
        super(chainId, provider, signer, {
            localhost: {
                address: Localhost_SpaceManagerAddresses.tokengranted,
                abi: Localhost_TokenEntitlementModuleArtifact.abi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.tokengranted,
                abi: Goerli_TokenEntitlementModuleArtifact.abi,
            },
        })
    }
}
