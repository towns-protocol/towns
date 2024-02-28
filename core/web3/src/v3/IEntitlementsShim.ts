import {
    IEntitlementsManager as LocalhostContract,
    IEntitlementsManagerBase as LocalhostIEntitlementsBase,
    IEntitlementsManagerInterface as LocalhostInterface,
} from '@towns/generated/dev/typings/IEntitlementsManager'
import {
    IEntitlementsManager as BaseSepoliaContract,
    IEntitlementsManagerInterface as BaseSepoliaInterface,
} from '@towns/generated/v3/typings/IEntitlementsManager'

import LocalhostAbi from '@towns/generated/dev/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }
}
