import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { IEntitlementDataQueryable__factory } from '@towns-protocol/generated/dev/typings/factories/IEntitlementDataQueryable__factory'
import { IEntitlementDataQueryableBase } from '@towns-protocol/generated/dev/typings/IEntitlementDataQueryable'

export class IEntitlementDataQueryableShim extends BaseContractShim<
    ContractType<typeof IEntitlementDataQueryable__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IEntitlementDataQueryable__factory.connect.bind(IEntitlementDataQueryable__factory),
        )
    }
}

export type EntitlementDataStructOutput = IEntitlementDataQueryableBase.EntitlementDataStructOutput
