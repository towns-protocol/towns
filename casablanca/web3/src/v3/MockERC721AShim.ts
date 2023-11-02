import {
    MockERC721A as LocalhostContract,
    MockERC721AInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/MockERC721A'
import {
    MockERC721A as BaseGoerliContract,
    MockERC721AInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/v3/typings/MockERC721A'

import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/MockERC721A.abi.json' assert { type: 'json' }

import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/MockERC721A.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export class MockERC721AShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
