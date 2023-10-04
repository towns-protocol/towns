import {
    IEntitlementsManager as GoerliContract,
    IEntitlementsManagerInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IEntitlementsManager'
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
    IEntitlementsManager as SepoliaContract,
    IEntitlementsManagerInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IEntitlementsManager'

import { BaseContractShimV3 } from './BaseContractShimV3'

import GoerliAbi from '@towns/generated/goerli/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import SepoliaAbi from '@towns/generated/sepolia/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
