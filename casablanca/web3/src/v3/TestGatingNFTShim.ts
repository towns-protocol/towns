import {
    Member as LocalhostContract,
    MemberInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Member'
import {
    Member as BaseGoerliContract,
    MemberInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/typings/Member'
import {
    Member as BaseSepoliaContract,
    MemberInterface as BaseSepoliaInterface,
} from '@towns/generated/base_sepolia/v3/typings/Member'

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Member.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/v3/abis/Member.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@towns/generated/base_sepolia/v3/abis/Member.abi.json' assert { type: 'json' }

import { BaseContractShim } from './BaseContractShim'
import { ethers } from 'ethers'

export class TestGatingNFTShim extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseGoerliContract,
    BaseGoerliInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(address: string, chainId: number, provider: ethers.providers.Provider | undefined) {
        super(address, chainId, provider, {
            localhostAbi: LocalhostAbi,
            baseGoerliAbi: BaseGoerliAbi,
            baseSepoliaAbi: BaseSepoliaAbi,
        })
    }
}
