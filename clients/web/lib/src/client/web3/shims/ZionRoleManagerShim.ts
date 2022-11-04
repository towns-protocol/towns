/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import { ZionRoleManager as Goerli_ZionRoleManager } from '@harmony/contracts/goerli/typings/ZionRoleManager'
import Goerli_ZionRoleManagerArtifact from '@harmony/contracts/goerli/abis/ZionRoleManager.json'
import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import type { ZionRoleManager as Localhost_ZionRoleManager } from '@harmony/contracts/localhost/typings/ZionRoleManager'
import Localhost_ZionRoleManagerArtifact from '@harmony/contracts/localhost/abis/ZionRoleManager.json'
import { ethers } from 'ethers'

export class ZionRoleManagerShim extends BaseContractShim<
    Localhost_ZionRoleManager,
    Goerli_ZionRoleManager
> {
    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        chainId: number,
    ) {
        super(chainId, provider, signer, {
            localhost: {
                address: Localhost_SpaceManagerAddresses.rolemanager,
                abi: Localhost_ZionRoleManagerArtifact.abi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.rolemanager,
                abi: Goerli_ZionRoleManagerArtifact.abi,
            },
        })
    }
}
