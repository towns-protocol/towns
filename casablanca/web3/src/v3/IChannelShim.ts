import {
    IChannel as GoerliContract,
    IChannelInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IChannel'
import {
    IChannel as LocalhostContract,
    IChannelBase as LocalhostIChannelBase,
    IChannelInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IChannel'
import {
    IChannel as SepoliaContract,
    IChannelInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IChannel'
import {
    IChannel as BaseGoerliContract,
    IChannelInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IChannel'

import GoerliAbi from '@towns/generated/goerli/v3/abis/Channels.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/Channels.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Channels.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostIChannelBase as IChannelBase }

export class IChannelShim extends BaseContractShimV3<
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
