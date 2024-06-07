import {
    PrepayFacet as LocalhostContract,
    PrepayFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/PrepayFacet'
import {
    PrepayFacet as BaseSepoliaContract,
    PrepayFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/PrepayFacet'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/PrepayFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/PrepayFacet.abi.json' assert { type: 'json' }

export class IPrepayShim extends BaseContractShim<
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
