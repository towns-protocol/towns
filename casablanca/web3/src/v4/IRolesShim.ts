import LocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi'
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Roles.abi'

import { BaseContractShim } from './BaseContractShim'
import { Address, PublicClient } from 'viem'

const abis = {
    localhostAbi: LocalhostAbi,
    testnetAbi: BaseGoerliAbi,
} as const

export class IRolesShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
