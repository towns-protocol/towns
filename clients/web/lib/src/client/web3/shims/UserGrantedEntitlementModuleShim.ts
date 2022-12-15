/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_UserGrantedEntitlementModuleArtifactAbi from '@harmony/contracts/goerli/abis/UserGrantedEntitlementModule.abi.json'
import { TokenEntitlementModule as Goerli_TokenEntitlementModule } from '@harmony/contracts/goerli/typings/TokenEntitlementModule'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_UserGrantedEntitlementModuleArtifaceAbi from '@harmony/contracts/localhost/abis/UserGrantedEntitlementModule.abi.json'
import { UserGrantedEntitlementModule as Localhost_UserGrantedEntitlementModule } from '@harmony/contracts/localhost/typings/UserGrantedEntitlementModule'
import { ethers } from 'ethers'

export class UserGrantedEntitlementModuleShim extends BaseContractShim<
    Localhost_UserGrantedEntitlementModule,
    Goerli_TokenEntitlementModule
> {
    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        chainId: number,
    ) {
        super(chainId, provider, signer, {
            localhost: {
                address: Localhost_SpaceManagerAddresses.usergranted,
                abi: Localhost_UserGrantedEntitlementModuleArtifaceAbi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.usergranted,
                abi: Goerli_UserGrantedEntitlementModuleArtifactAbi,
            },
        })
    }
}
