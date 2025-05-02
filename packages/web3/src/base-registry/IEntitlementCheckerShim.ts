import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IEntitlementChecker__factory } from '@towns-protocol/generated/dev/typings/factories/IEntitlementChecker__factory'
import { ContractType } from '../types/typechain'

export class IEntitlementCheckerShim extends BaseContractShim<
    ContractType<typeof IEntitlementChecker__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IEntitlementChecker__factory.connect.bind(IEntitlementChecker__factory),
        )
    }
}
