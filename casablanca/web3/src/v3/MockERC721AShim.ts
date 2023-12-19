import {
    MockERC721A as LocalhostContract,
    MockERC721AInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/MockERC721A'
import {
    MockERC721A as BaseSepoliaContract,
    MockERC721AInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/MockERC721A'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/MockERC721A.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/MockERC721A.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class MockERC721AShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            31337: LocalhostAbi,
            84532: BaseSepoliaAbi,
        })
    }
}
