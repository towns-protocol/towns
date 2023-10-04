import {
    IMulticall as GoerliContract,
    IMulticallInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IMulticall'
import {
    IMulticall as LocalhostContract,
    IMulticallInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IMulticall'
import {
    IMulticall as SepoliaContract,
    IMulticallInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IMulticall'
import {
    IMulticall as BaseGoerliContract,
    IMulticallInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IMulticall'

import GoerliAbi from '@towns/generated/goerli/v3/abis/Multicall.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Multicall.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/Multicall.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Multicall.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'

export class IMulticallShim extends BaseContractShimV3<
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
