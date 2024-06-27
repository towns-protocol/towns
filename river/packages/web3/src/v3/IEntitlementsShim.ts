import {
    IEntitlementsManager as LocalhostContract,
    IEntitlementsManagerBase as LocalhostIEntitlementsBase,
    IEntitlementsManagerInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IEntitlementsManager'

import LocalhostAbi from '@river-build/generated/dev/abis/EntitlementsManager.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIEntitlementsBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
