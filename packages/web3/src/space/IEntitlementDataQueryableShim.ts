import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IEntitlementDataQueryable__factory } from '@towns-protocol/generated/dev/typings/factories/IEntitlementDataQueryable__factory'
import { IEntitlementDataQueryableBase } from '@towns-protocol/generated/dev/typings/IEntitlementDataQueryable'

const { abi, connect } = IEntitlementDataQueryable__factory

export class IEntitlementDataQueryableShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}

export type EntitlementDataStructOutput = IEntitlementDataQueryableBase.EntitlementDataStructOutput
