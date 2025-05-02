import { IEntitlementsManager__factory } from '@towns-protocol/generated/dev/typings'
import { ethers } from 'ethers'
import { ContractType } from '../types/typechain'
import { IEntitlementsManagerBase } from '@towns-protocol/generated/dev/typings/IEntitlementsManager'
import { BaseContractShim } from '../BaseContractShim'

// TODO: extract from factory interface
export type { IEntitlementsManagerBase as IEntitlementsBase }

export class IEntitlementsShim extends BaseContractShim<
    ContractType<typeof IEntitlementsManager__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IEntitlementsManager__factory.connect.bind(IEntitlementsManager__factory),
        )
    }
}
