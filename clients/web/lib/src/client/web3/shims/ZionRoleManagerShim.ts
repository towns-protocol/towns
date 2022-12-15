/* eslint-disable no-restricted-imports */

import { BaseContractShim } from './BaseContractShim'
import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_ZionRoleManagerArtifactAbi from '@harmony/contracts/goerli/abis/ZionRoleManager.abi.json'
import { ZionRoleManager as Goerli_ZionRoleManager } from '@harmony/contracts/goerli/typings/ZionRoleManager'

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_ZionRoleManagerArtifactAbi from '@harmony/contracts/localhost/abis/ZionRoleManager.abi.json'
import { ZionRoleManager as Localhost_ZionRoleManager } from '@harmony/contracts/localhost/typings/ZionRoleManager'
import { ethers } from 'ethers'

import { DataTypes as Localhost_DataTypes } from '@harmony/contracts/localhost/typings/ZionRoleManager'

export type { Localhost_DataTypes as RoleManagerDataTypes }

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
                abi: Localhost_ZionRoleManagerArtifactAbi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.rolemanager,
                abi: Goerli_ZionRoleManagerArtifactAbi,
            },
        })
    }
}
