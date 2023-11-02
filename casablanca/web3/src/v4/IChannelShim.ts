import LocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Channels.abi'

import { Address, PublicClient } from 'viem'
import { BaseContractShim } from './BaseContractShim'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class IChannelShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
