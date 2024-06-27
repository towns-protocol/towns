import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IMulticall'

import LocalhostAbi from '@river-build/generated/dev/abis/IMulticall.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMulticallShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
