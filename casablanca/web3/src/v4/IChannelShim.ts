import LocalhostAbi from '@towns/generated/localhost/v3/abis/Channels.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Channels.abi'

import { Address, Chain, PublicClient, Transport } from 'viem'
import { BaseContractShimV4 } from './BaseContractShimV4'
import { ContractFunctionOutputs } from './types'

export interface IChannelBase {
    ChannelStructOutput: ContractFunctionOutputs<typeof LocalhostAbi, 'getChannel'>[0]
}

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class IChannelShim<T extends Transport, C extends Chain> extends BaseContractShimV4<
    typeof abis,
    T,
    C
> {
    constructor(address: Address, chainId: number, client: PublicClient<T, C> | undefined) {
        super(address, chainId, client, abis)
    }
}
