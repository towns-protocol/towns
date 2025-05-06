import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IEntitlementChecker__factory } from '@towns-protocol/generated/dev/typings/factories/IEntitlementChecker__factory'

const { abi, connect } = IEntitlementChecker__factory

export class IEntitlementCheckerShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
