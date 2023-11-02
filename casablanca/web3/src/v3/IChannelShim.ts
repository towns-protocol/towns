import {
    IChannel as LocalhostContract,
    IChannelBase as LocalhostIChannelBase,
    IChannelInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IChannel'
import {
    IChannel as BaseGoerliContract,
    IChannelInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/IChannel'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Channels.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIChannelBase as IChannelBase }

export class IChannelShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
