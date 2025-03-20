import {
    MockERC721A as LocalhostContract,
    MockERC721AInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/MockERC721A'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/MockERC721A.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export class MockERC721AShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
