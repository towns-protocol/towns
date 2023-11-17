import LocalhostAbi from '@towns/generated/localhost/abis/Pioneer.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/abis/Pioneer.abi'

import { BaseContractShim } from './BaseContractShim'
import { Address, PublicClient } from 'viem'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class PioneerNFTShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
