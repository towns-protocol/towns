import {
    MockERC721A as LocalhostContract,
    MockERC721AInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/MockERC721A'
import {
    MockERC721A as BaseSepoliaContract,
    MockERC721AInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/MockERC721A'

import LocalhostAbi from '@river-build/generated/dev/abis/MockERC721A.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/MockERC721A.abi.json' assert { type: 'json' }

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
