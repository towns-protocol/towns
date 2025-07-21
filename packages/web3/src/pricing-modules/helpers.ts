import { SpaceDapp } from '../space-dapp/SpaceDapp'
import { PricingModuleStruct } from '../types/ContractTypes'

/**
 * @deprecated
 * Use TIERED_PRICING_ORACLE_V2 or TIERED_PRICING_ORACLE_V3 instead
 * Yes, the correct value for this constant is "TieredLogPricingOracleV2"
 */
export const TIERED_PRICING_ORACLE = 'TieredLogPricingOracleV2'
export const TIERED_PRICING_ORACLE_V2 = 'TieredLogPricingOracleV2'
export const TIERED_PRICING_ORACLE_V3 = 'TieredLogPricingOracleV3'
export const FIXED_PRICING = 'FixedPricing'

export const getDynamicPricingModule = async (spaceDapp: SpaceDapp | undefined) => {
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

export const getFixedPricingModule = async (spaceDapp: SpaceDapp | undefined) => {
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
    pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE_V3) ||
    pricingModules.find((module) => module.name === TIERED_PRICING_ORACLE_V2)

export const findFixedPricingModule = (pricingModules: PricingModuleStruct[]) =>
    pricingModules.find((module) => module.name === FIXED_PRICING)
