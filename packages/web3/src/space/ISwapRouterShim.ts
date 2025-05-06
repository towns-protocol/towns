import {
    ISwapRouter as LocalhostContract,
    ISwapRouterInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/ISwapRouter'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/ISwapRouter.abi.json' assert { type: 'json' }

export class ISwapRouterShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
