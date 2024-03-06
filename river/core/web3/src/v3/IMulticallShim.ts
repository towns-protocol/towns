import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IMulticall'
import {
    IMulticall as BaseSepoliaContract,
    IMulticallInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/IMulticall'

import LocalhostAbi from '@river/generated/dev/abis/IMulticall.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/IMulticall.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMulticallShim extends BaseContractShim<
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
