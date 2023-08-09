/* eslint-disable no-restricted-imports */

import {
    ITownArchitect as GoerliContract,
    ITownArchitectInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/ITownArchitect'
import {
    ITownArchitect as LocalhostContract,
    ITownArchitectBase as LocalhostITownArchitectBase,
    ITownArchitectInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/ITownArchitect'
import {
    ITownArchitect as SepoliaContract,
    ITownArchitectInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/ITownArchitect'

import GoerliAbi from '@towns/generated/goerli/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import { BaseContractShimV3 } from './BaseContractShimV3'
import { ethers } from 'ethers'

export type { LocalhostITownArchitectBase as ITownArchitectBase }

export class ITownArchitectShim extends BaseContractShimV3<
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
