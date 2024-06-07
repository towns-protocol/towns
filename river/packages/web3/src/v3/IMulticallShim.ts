import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IMulticall'
import {
    IMulticall as BaseSepoliaContract,
    IMulticallInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IMulticall'

import LocalhostAbi from '@river-build/generated/dev/abis/IMulticall.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/IMulticall.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export class IMulticallShim extends BaseContractShim<
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
