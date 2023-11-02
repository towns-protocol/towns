import {
    IEntitlementsManager as LocalhostContract,
    IEntitlementsManagerBase as LocalhostIEntitlementsBase,
    IEntitlementsManagerInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IEntitlementsManager'
import {
    IEntitlementsManager as BaseGoerliContract,
    IEntitlementsManagerInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IEntitlementsManager'

import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/EntitlementsManager.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
