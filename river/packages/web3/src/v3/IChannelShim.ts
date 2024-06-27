import {
    IChannel as LocalhostContract,
    IChannelBase as LocalhostIChannelBase,
    IChannelInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/IChannel'

import LocalhostAbi from '@river-build/generated/dev/abis/Channels.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIChannelBase as IChannelBase }

export class IChannelShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
