import {
    IEntitlementDataQueryable as LocalhostContract,
    IEntitlementDataQueryableInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IEntitlementDataQueryable'

import {
    IEntitlementDataQueryable as BaseSepoliaContract,
    IEntitlementDataQueryableInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IEntitlementDataQueryable'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/IEntitlementDataQueryable.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IEntitlementDataQueryable.abi.json' assert { type: 'json' }

export class IEntitlementDataQueryableShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }
}
