import {
    ITipping as LocalhostContract,
    ITippingInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/ITipping'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import DevAbi from '@river-build/generated/dev/abis/ITipping.abi.json' assert { type: 'json' }

export class ITippingShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, DevAbi)
    }

    /**
     * Get the total number of tips by currency
     * @param currency - The currency to get the total tips for
     * @returns The total number of tips by currency
     */
    public async totalTipsByCurrency(currency: string): Promise<bigint> {
        const totalTips = await this.read.totalTipsByCurrency(currency)
        return totalTips.toBigInt()
    }

    /**
     * Get the tip amount by currency
     * @param currency - The currency to get the tip amount for
     * @returns The tip amount by currency
     */
    public async tipAmountByCurrency(currency: string): Promise<bigint> {
        const tips = await this.read.tipAmountByCurrency(currency)
        return tips.toBigInt()
    }
}
