import {
    IEntitlements as GoerliContract,
    IEntitlementsInterface as GoerliInterface,
} from '@towns/generated/goerli/v3/typings/IEntitlements'
import {
    IEntitlements as LocalhostContract,
    IEntitlementsBase as LocalhostIEntitlementsStructs,
    IEntitlementsInterface as LocalhostInterface,
} from '@towns/generated/localhost/v3/typings/IEntitlements'
import {
    IEntitlements as SepoliaContract,
    IEntitlementsInterface as SepoliaInterface,
} from '@towns/generated/sepolia/v3/typings/IEntitlements'

import { BaseContractShimV3 } from './BaseContractShimV3'

import GoerliAbi from '@towns/generated/goerli/v3/abis/Entitlements.abi.json' assert { type: 'json' }

import LocalhostAbi from '@towns/generated/localhost/v3/abis/Entitlements.abi.json' assert { type: 'json' }

import SepoliaAbi from '@towns/generated/sepolia/v3/abis/Entitlements.abi.json' assert { type: 'json' }
import { ethers } from 'ethers'

export type { LocalhostIEntitlementsStructs as IEntitlementsStructs }

export class IEntitlementsShim extends BaseContractShimV3<
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
