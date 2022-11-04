/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-namespace */

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_ZionSpaceManagerArtifact from '@harmony/contracts/localhost/abis/ZionSpaceManager.json'
import type {
    ZionSpaceManager as Localhost_ZionSpaceManager,
    DataTypes as Localhost_DataTypes,
} from '@harmony/contracts/localhost/typings/ZionSpaceManager'
import { PromiseOrValue as Localhost_PromiseOrValue } from '@harmony/contracts/localhost/typings/common'

import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_ZionSpaceManagerArtifact from '@harmony/contracts/goerli/abis/ZionSpaceManager.json'
import { ZionSpaceManager as Goerli_ZionSpaceManager } from '@harmony/contracts/goerli/typings/ZionSpaceManager'

import { ContractTransaction, ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

/**
 * This class is a shim https://en.wikipedia.org/wiki/Shim_(computing)
 *
 * we want to enable fast development on local host
 * but we also want to be able to deploy to other networks
 * This class wraps the contract and provides a consistent interface
 * to the rest of the application, and handles any differences between
 * apis on different networks
 *
 * we expose the local host data types
 * all return types should eithr be generic, or transform to the local host data types
 * adding a new network should be as simple as exporing new abis and types, and
 * adding a new case to the switch statement in the base class
 *
 * in the case that the api is the same (like signed.interface.parseError, feel free
 * to just use the base class common implementation)
 *
 */

export type { Localhost_DataTypes as DataTypes }
export type PromiseOrValue<T> = Localhost_PromiseOrValue<T>

export class ZionSpaceManagerShim extends BaseContractShim<
    Localhost_ZionSpaceManager,
    Goerli_ZionSpaceManager
> {
    constructor(
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
        chainId: number,
    ) {
        super(chainId, provider, signer, {
            localhost: {
                address: Localhost_SpaceManagerAddresses.spacemanager,
                abi: Localhost_ZionSpaceManagerArtifact.abi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.spacemanager,
                abi: Goerli_ZionSpaceManagerArtifact.abi,
            },
        })
    }

    async createSpace(
        info: Localhost_DataTypes.CreateSpaceDataStruct,
        entitlementData: Localhost_DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: Localhost_DataTypes.PermissionStruct[],
    ): Promise<ContractTransaction> {
        return this.signed.createSpace(info, entitlementData, everyonePermissions)
    }
    async getSpaces(): Promise<Localhost_DataTypes.SpaceInfoStructOutput[]> {
        return this.unsigned.getSpaces()
    }
}
