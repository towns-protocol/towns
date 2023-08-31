/* eslint-disable no-restricted-imports */

import {
    Pioneer as GoerliContract,
    PioneerInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/Pioneer'
import {
    Pioneer as LocalhostContract,
    PioneerInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Pioneer'

import {
    Pioneer as SepoliaContract,
    PioneerInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/Pioneer'

import GoerliAbi from '@towns/generated/goerli/abis/Pioneer.abi.json' assert { type: 'json' }
import LocalhostAbi from '@towns/generated/localhost/abis/Pioneer.abi.json' assert { type: 'json' }
import SepoliaAbi from '@towns/generated/sepolia/abis/Pioneer.abi.json' assert { type: 'json' }
import { BaseContractShimV3 } from '../v3/BaseContractShimV3'
import { ethers } from 'ethers'

export class PioneerNFTShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
        })
    }
}
