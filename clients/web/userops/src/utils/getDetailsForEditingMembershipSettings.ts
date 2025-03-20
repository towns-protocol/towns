import { Space, SpaceDapp } from '@towns-protocol/web3'

export async function getDetailsForEditingMembershipSettings(params: {
    spaceDapp: SpaceDapp | undefined
    spaceId: string
    space: Space
}) {
    const { spaceDapp, spaceId, space } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const membershipInfo = await spaceDapp.getMembershipInfo(spaceId)

    const entitlementShims = await space.getEntitlementShims()
    if (!entitlementShims.length) {
        throw new Error('Rule entitlement not found')
    }

    // minter role = 1
    const roleEntitlements = await space.getRoleEntitlements(entitlementShims, 1)
    return {
        membershipInfo,
        freeAllocation: await space.Membership.read.getMembershipFreeAllocation(),
        roleEntitlements,
    }
}
