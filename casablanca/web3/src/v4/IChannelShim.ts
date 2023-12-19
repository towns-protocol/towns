import LocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi'
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/Channels.abi'

import { Address, PublicClient } from 'viem'
import { BaseContractShim } from './BaseContractShim'

const abis = {
    31337: LocalhostAbi,
    84532: BaseSepoliaAbi,
} as const

export class IChannelShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
