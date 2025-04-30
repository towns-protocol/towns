import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/IMulticall'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/IMulticall.abi.json' with { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMulticallShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
