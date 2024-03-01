import {
    IChannel as LocalhostContract,
    IChannelBase as LocalhostIChannelBase,
    IChannelInterface as LocalhostInterface,
} from '@river/generated/dev/typings/IChannel'
import {
    IChannel as BaseSepoliaContract,
    IChannelInterface as BaseSepoliaInterface,
} from '@river/generated/v3/typings/IChannel'

import LocalhostAbi from '@river/generated/dev/abis/Channels.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river/generated/v3/abis/Channels.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIChannelBase as IChannelBase }

export class IChannelShim extends BaseContractShim<
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
