import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownArchitect.abi'

import { BaseContractShimV4 } from './BaseContractShimV4'
import { Address, Chain, PublicClient, Transport } from 'viem'
import { ContractFunctionInputs } from './types'

export interface ITownArchitectBase {
    MembershipStruct: ContractFunctionInputs<typeof LocalhostAbi, 'computeTown'>[1]
    TownStruct: ContractFunctionInputs<typeof LocalhostAbi, 'createTown'>[0]
}

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class ITownArchitectShim<T extends Transport, C extends Chain> extends BaseContractShimV4<
    typeof abis,
    T,
    C
> {
    constructor(address: Address, chainId: number, client: PublicClient<T, C> | undefined) {
        super(address, chainId, client, abis)
    }
}
