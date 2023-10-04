/* eslint-disable no-restricted-imports */

import {
    Member as GoerliContract,
    MemberInterface as GoerliInterface,
} from '@towns/generated/goerli/typings/Member'
import {
    Member as LocalhostContract,
    MemberInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Member'

import {
    Member as SepoliaContract,
    MemberInterface as SepoliaInterface,
} from '@towns/generated/sepolia/typings/Member'
import {
    Member as BaseGoerliContract,
    MemberInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/typings/Member'

import { BaseContractShimV3 } from './BaseContractShimV3'
import { ethers } from 'ethers'
import LocalhostAbi from '@towns/generated/localhost/abis/Member.abi.json' assert { type: 'json' }
import GoerliAbi from '@towns/generated/goerli/abis/Member.abi.json' assert { type: 'json' }
import SepoliaAbi from '@towns/generated/sepolia/abis/Member.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/abis/Member.abi.json' assert { type: 'json' }

export class MemberNFTShim extends BaseContractShimV3<
    LocalhostContract,
    LocalhostInterface,
    GoerliContract,
    GoerliInterface,
    SepoliaContract,
    SepoliaInterface,
    BaseGoerliContract,
    BaseGoerliInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            goerliAbi: GoerliAbi,
            sepoliaAbi: SepoliaAbi,
            baseGoerliAbi: BaseGoerliAbi,
        })
    }
}
