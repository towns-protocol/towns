/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-namespace */

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_ZionSpaceManagerArtifactAbi from '@harmony/contracts/localhost/abis/ZionSpaceManager.abi.json'
import type {
    ZionSpaceManager as Localhost_ZionSpaceManager,
    DataTypes as Localhost_DataTypes,
} from '@harmony/contracts/localhost/typings/ZionSpaceManager'
import { PromiseOrValue as Localhost_PromiseOrValue } from '@harmony/contracts/localhost/typings/common'

import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_ZionSpaceManagerArtifactAbi from '@harmony/contracts/goerli/abis/ZionSpaceManager.abi.json'
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
                abi: Localhost_ZionSpaceManagerArtifactAbi,
            },
            goerli: {
                address: Goerli_SpaceManagerAddresses.spacemanager,
                abi: Goerli_ZionSpaceManagerArtifactAbi,
            },
        })
    }

    public async getSpaces(): Promise<Localhost_DataTypes.SpaceInfoStructOutput[]> {
        return this.unsigned.getSpaces()
    }

    public async createSpace(
        info: Localhost_DataTypes.CreateSpaceDataStruct,
        entitlementData: Localhost_DataTypes.CreateSpaceEntitlementDataStruct,
        everyonePermissions: Localhost_DataTypes.PermissionStruct[],
    ): Promise<ContractTransaction> {
        try {
            console.log(`createSpace called`, info, entitlementData, everyonePermissions)

            if (this.isGoerli) {
                return this.goerli_signed.createSpace(info, entitlementData, everyonePermissions)
            } else {
                console.log(`createSpace localhost_signed`)

                const result = await this.localhost_signed.createSpace(
                    info,
                    entitlementData,
                    everyonePermissions,
                )
                console.log(`createSpace result`, result)
                return result
            }
        } catch (error) {
            console.log(`createSpace error`, error)
            throw error
        } finally {
            console.log(`createSpace finally`)
        }
    }

    public async createChannel(
        info: Localhost_DataTypes.CreateChannelDataStruct,
    ): Promise<ContractTransaction> {
        if (this.isGoerli) {
            return this.goerli_signed.createChannel(info)
        } else {
            return this.localhost_signed.createChannel(info)
        }
    }

    public async createRoleWithEntitlementData(
        spaceNetworkId: string,
        roleName: string,
        permissions: Localhost_DataTypes.PermissionStruct[],
        tokenEntitlements: Localhost_DataTypes.ExternalTokenEntitlementStruct[],
        users: string[],
    ): Promise<ContractTransaction> {
        if (this.isGoerli) {
            return this.goerli_signed.createRoleWithEntitlementData(
                spaceNetworkId,
                roleName,
                permissions,
                tokenEntitlements,
                users,
            )
        } else {
            return this.localhost_signed.createRoleWithEntitlementData(
                spaceNetworkId,
                roleName,
                permissions,
                tokenEntitlements,
                users,
            )
        }
    }
}
