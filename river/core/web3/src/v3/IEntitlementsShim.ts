import {
    IEntitlementsManager as LocalhostContract,
    IEntitlementsManagerBase as LocalhostIEntitlementsBase,
    IEntitlementsManagerInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IEntitlementsManager'
import {
    IEntitlementsManager as BaseSepoliaContract,
    IEntitlementsManagerInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/IEntitlementsManager'

import LocalhostAbi from '@river-build/generated/dev/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<
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
