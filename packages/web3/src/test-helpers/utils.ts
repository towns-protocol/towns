import { MembershipStruct, Permission } from '../types/ContractTypes'
import { EncodedNoopRuleData } from '../space/entitlements/entitlement'
import { ETH_ADDRESS } from '../utils/ut'
import { SpaceDapp } from '../space-dapp/SpaceDapp'
import { getDynamicPricingModule, getFixedPricingModule } from '../pricing-modules/helpers'

export async function makeDefaultMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
    price = 0n,
    freeAllocation = 1000,
) {
    const pricingModules = await spaceDapp.readApp.pricingModules.read.listPricingModules()
    const pricingModule =
        pricing == 'dynamic'
            ? await getDynamicPricingModule(pricingModules)
            : await getFixedPricingModule(pricingModules)
    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: feeRecipient,
            freeAllocation,
            pricingModule: pricingModule.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements: {
            everyone: true,
            users: [],
            syncEntitlements: false,
            ruleData: EncodedNoopRuleData,
        },
    } satisfies MembershipStruct
}
