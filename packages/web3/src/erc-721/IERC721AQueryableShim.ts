import {
    IERC721AQueryable as LocalhostContract,
    IERC721AQueryableInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/IERC721AQueryable'

import { ethers } from 'ethers'
import { BaseContractShim } from 'BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/IERC721AQueryable.abi.json' assert { type: 'json' }

export class IERC721AQueryableShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
