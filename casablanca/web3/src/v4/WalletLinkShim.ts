import LocalhostAbi from '@towns/generated/localhost/v3/abis/WalletLink.abi'
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/WalletLink.abi'

import { BaseContractShim } from './BaseContractShim'
import { Address, PublicClient } from 'viem'

const abis = {
    31337: LocalhostAbi,
    84532: BaseSepoliaAbi,
} as const

export class IWalletLinkShim extends BaseContractShim<typeof abis> {
    constructor(address: Address, chainId: number, client: PublicClient | undefined) {
        super(address, chainId, client, abis)
    }
}
