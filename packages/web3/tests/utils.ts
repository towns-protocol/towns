import { MembershipStruct, Permission } from '../src/ContractTypes'
import { EncodedNoopRuleData } from '../src/entitlement'
import { ETH_ADDRESS, getDynamicPricingModule, getFixedPricingModule } from '../src/Utils'
import { SpaceDapp } from '../src/v3/SpaceDapp'

export async function makeDefaultMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
    price = 0n,
    freeAllocation = 1000,
) {
    const pricingModule =
        pricing == 'dynamic'
            ? await getDynamicPricingModule(spaceDapp)
            : await getFixedPricingModule(spaceDapp)
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
