import { ethers } from 'ethers'
import { IStaticContractsInfo } from '../IStaticContractsInfo'
import { PricingModuleStruct } from '../ContractTypes'
import { IPricingShim } from './IPricingShim'

export class PricingModules {
    private readonly pricingShim: IPricingShim

    constructor(
        contractInfo: IStaticContractsInfo,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.pricingShim = new IPricingShim(contractInfo.townFactoryAddress, chainId, provider)
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
