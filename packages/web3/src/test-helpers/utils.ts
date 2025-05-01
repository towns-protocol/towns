import { MembershipStruct, Permission } from '../types'
import { EncodedNoopRuleData } from '../space'
import { ETH_ADDRESS, getDynamicPricingModule, getFixedPricingModule } from '../utils'
import { SpaceDapp } from '../space-dapp'

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
