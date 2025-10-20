import {
    ETH_ADDRESS,
    MembershipStruct,
    EncodedNoopRuleData,
    Permission,
    SpaceDapp,
    getDynamicPricingModule,
    getFixedPricingModule,
} from '@towns-protocol/web3'

export async function makeDefaultMembershipInfo(
    spaceDapp: SpaceDapp,
    feeRecipient: string,
    pricing: 'dynamic' | 'fixed' = 'dynamic',
): Promise<MembershipStruct> {
    const readApp = spaceDapp.readApp
    const pricingModules = await readApp.pricingModules.read.listPricingModules()
    const pricingModule =
        pricing == 'dynamic'
            ? await getDynamicPricingModule(pricingModules)
            : await getFixedPricingModule(pricingModules)
    return {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: feeRecipient,
            freeAllocation: 1000,
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
