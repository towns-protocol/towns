import {
    ETH_ADDRESS,
    MembershipStruct,
    EncodedNoopRuleData,
    Permission,
    SpaceDapp,
    getDynamicPricingModule,
    getFixedPricingModule,
} from '@towns-protocol/web3'
import { DEFAULT_MEMBERSHIP_LIMIT } from '../constants'

export async function makeDefaultMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
): Promise<MembershipStruct> {
    const [pricingModule, freeAllocation] = await Promise.all([
        pricing == 'dynamic'
            ? getDynamicPricingModule(spaceDapp)
            : getFixedPricingModule(spaceDapp),
        spaceDapp.platformRequirements.getMembershipMintLimit(),
    ])
    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: DEFAULT_MEMBERSHIP_LIMIT,
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
