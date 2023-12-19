import LocalhostAbi from '@towns/generated/localhost/v3/abis/Roles.abi'
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/Roles.abi'

import { BaseContractShim } from './BaseContractShim'
import { Address, PublicClient } from 'viem'

const abis = {
    31337: LocalhostAbi,
    84532: BaseSepoliaAbi,
} as const

export class IRolesShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
