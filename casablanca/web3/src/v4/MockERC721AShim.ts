import LocalhostAbi from '@towns/generated/localhost/v3/abis/MockERC721A.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/MockERC721A.abi'

import { BaseContractShimV4 } from './BaseContractShimV4'
import { Address, PublicClient } from 'viem'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const
export class MockERC721AShim extends BaseContractShimV4<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
