import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/TownArchitect.abi'

import { BaseContractShimV4 } from './BaseContractShimV4'
import { Address, PublicClient } from 'viem'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class ITownArchitectShim extends BaseContractShimV4<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
