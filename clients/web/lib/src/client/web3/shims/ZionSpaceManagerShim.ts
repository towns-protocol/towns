/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-namespace */

import Localhost_SpaceManagerAddresses from '@harmony/contracts/localhost/addresses/space-manager.json'
import Localhost_ZionSpaceManagerArtifact from '@harmony/contracts/localhost/abis/ZionSpaceManager.json'
import type {
    ZionSpaceManager as Localhost_ZionSpaceManager,
    DataTypes as Localhost_DataTypes,
} from '@harmony/contracts/localhost/typings/types/ZionSpaceManager'
import { PromiseOrValue as Localhost_PromiseOrValue } from '@harmony/contracts/localhost/typings/types/common'

import Goerli_SpaceManagerAddresses from '@harmony/contracts/goerli/addresses/space-manager.json'
import Goerli_ZionSpaceManagerArtifact from '@harmony/contracts/goerli/abis/ZionSpaceManager.json'
import {
    ZionSpaceManager as Goerli_ZionSpaceManager,
    DataTypes as Goerli_DataTypes,
} from '@harmony/contracts/goerli/typings/types/ZionSpaceManager'

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
    ): Promise<ContractTransaction> {
        if (this.isLocalhost) {
            return this.localhost_signed.createSpace(info)
        } else if (this.isGoerli) {
            return this.goerli_signed.createSpace({
                spaceName: info.spaceName,
                networkId: info.spaceNetworkId,
            })
        } else {
            throw new Error('unsupported network')
        }
    }

    async createSpaceWithTokenEntitlement(
        info: Localhost_DataTypes.CreateSpaceDataStruct,
        entitlement: Localhost_DataTypes.CreateSpaceTokenEntitlementDataStruct,
    ): Promise<ContractTransaction> {
        if (this.isLocalhost) {
            return this.localhost_signed.createSpaceWithTokenEntitlement(info, entitlement)
        } else if (this.isGoerli) {
            return this.goerli_signed.createSpaceWithTokenEntitlement(
                {
                    spaceName: info.spaceName,
                    networkId: info.spaceNetworkId,
                },
                entitlement,
            )
        } else {
            throw new Error('unsupported network')
        }
    }
    async getSpaces(): Promise<Localhost_DataTypes.SpaceInfoStructOutput[]> {
        if (this.isLocalhost) {
            return this.localhost_unsigned.getSpaces()
        } else if (this.isGoerli) {
            const result = await this.goerli_unsigned.getSpaces()
            const mapped: Localhost_DataTypes.SpaceInfoStructOutput[] = result.map(
                (x: Goerli_DataTypes.SpaceInfoStructOutput) =>
                    ({
                        spaceId: x.spaceId,
                        networkId: '',
                        createdAt: x.createdAt,
                        name: x.name,
                        creator: x.creator,
                        owner: x.owner,
                        disabled: false,
                    } as Localhost_DataTypes.SpaceInfoStructOutput),
            )
            return mapped
        } else {
            throw new Error('unsupported network')
        }
    }
}
