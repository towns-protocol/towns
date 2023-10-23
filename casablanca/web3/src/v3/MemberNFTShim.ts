import {
    Member as LocalhostContract,
    MemberInterface as LocalhostInterface,
} from '@towns/generated/localhost/typings/Member'

import {
    Member as BaseGoerliContract,
    MemberInterface as BaseGoerliInterface,
} from '@towns/generated/base_goerli/typings/Member'

import { BaseContractShimV3 } from './BaseContractShimV3'
import { ethers } from 'ethers'
import LocalhostAbi from '@towns/generated/localhost/abis/Member.abi.json' assert { type: 'json' }
import BaseGoerliAbi from '@towns/generated/base_goerli/abis/Member.abi.json' assert { type: 'json' }

export class MemberNFTShim extends BaseContractShimV3<
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
