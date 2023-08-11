import {
    TokenEntitlement as GoerliContract,
    TokenEntitlementInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as LocalhostContract,
    DataTypes as LocalhostDataTypes,
    TokenEntitlementInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/TokenEntitlement'
import {
    TokenEntitlement as SepoliaContract,
    TokenEntitlementInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/TokenEntitlement'

import GoerliAbi from '@towns/generated/goerli/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/TokenEntitlement.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

import { BaseContractShimV3 } from './BaseContractShimV3'

export type { LocalhostDataTypes as TokenEntitlementDataTypes }

export class TokenEntitlementShim extends BaseContractShimV3<
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
