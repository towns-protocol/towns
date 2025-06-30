import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { RewardsDistributionV2__factory } from '@towns-protocol/generated/dev/typings/factories/RewardsDistributionV2__factory'

const { abi, connect } = RewardsDistributionV2__factory

export class RewardsDistributionV2Shim extends BaseContractShim<
    typeof connect
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
