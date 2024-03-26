import { PricingModuleStruct } from '@river/web3'
import { ISpaceDapp } from '../types/web3-types'

export const TIERED_PRICING_ORACLE = 'TieredLogPricingOracle'
export const FIXED_PRICING = 'FixedPricing'

export const getDynamicPricingModule = async (spaceDapp: ISpaceDapp | undefined) => {
    if (!spaceDapp) {
        throw new Error('getDynamicPricingModule: No spaceDapp')
    }
    const pricingModules = await spaceDapp.listPricingModules()
    const dynamicPricingModule = findDynamicPricingModule(pricingModules)
    if (!dynamicPricingModule) {
        throw new Error('getDynamicPricingModule: no dynamicPricingModule')
    }
    return dynamicPricingModule
}

export const getFixedPricingModule = async (spaceDapp: ISpaceDapp | undefined) => {
    if (!spaceDapp) {
        throw new Error('getFixedPricingModule: No spaceDapp')
    }
    const pricingModules = await spaceDapp.listPricingModules()
    const fixedPricingModule = findFixedPricingModule(pricingModules)
    if (!fixedPricingModule) {
        throw new Error('getFixedPricingModule: no fixedPricingModule')
    }
    return fixedPricingModule
}

export const findDynamicPricingModule = (pricingModules: PricingModuleStruct[]) =>
    pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE)

export const findFixedPricingModule = (pricingModules: PricingModuleStruct[]) =>
    pricingModules.find((module) => module.name === FIXED_PRICING)
