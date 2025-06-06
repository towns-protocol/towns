import { ethers } from 'ethers'
import { BaseChainConfig } from '../utils/IStaticContractsInfo'
import { PricingModuleStruct } from '../types/ContractTypes'
import { IPricingShim } from './IPricingShim'

export class PricingModules {
    private readonly pricingShim: IPricingShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.pricingShim = new IPricingShim(config.addresses.spaceFactory, provider)
    }

    public parseError(error: unknown): Error {
        return this.pricingShim.parseError(error)
    }

    public async listPricingModules(): Promise<PricingModuleStruct[]> {
        return this.pricingShim.read.listPricingModules()
    }

    public async addPricingModule(moduleAddress: string, signer: ethers.Signer): Promise<void> {
        await this.pricingShim.write(signer).addPricingModule(moduleAddress)
    }

    public async removePricingModule(moduleAddress: string, signer: ethers.Signer): Promise<void> {
        await this.pricingShim.write(signer).removePricingModule(moduleAddress)
    }

    public async isPricingModule(moduleAddress: string): Promise<boolean> {
        return this.pricingShim.read.isPricingModule(moduleAddress)
    }
}
