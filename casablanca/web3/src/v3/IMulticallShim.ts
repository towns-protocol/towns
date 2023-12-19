import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IMulticall'
import {
    IMulticall as BaseGoerliContract,
    IMulticallInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IMulticall'
import {
    IMulticall as BaseSepoliaContract,
    IMulticallInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/IMulticall'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Multicall.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Multicall.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/Multicall.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class IMulticallShim extends BaseContractShim<
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
