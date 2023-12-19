import {
    IEntitlementsManager as LocalhostContract,
    IEntitlementsManagerBase as LocalhostIEntitlementsBase,
    IEntitlementsManagerInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IEntitlementsManager'
import {
    IEntitlementsManager as BaseGoerliContract,
    IEntitlementsManagerInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IEntitlementsManager'
import {
    IEntitlementsManager as BaseSepoliaContract,
    IEntitlementsManagerInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/IEntitlementsManager'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
            baseSepoliaAbi: BaseSepoliaAbi,
        })
    }
}
