import {
    EVERYONE_ADDRESS,
    findDynamicPricingModule,
    findFixedPricingModule,
    LegacyUpdateRoleParams,
    NoopRuleData,
    Space,
    SpaceDapp,
    UpdateRoleParams,
} from '@river-build/web3'
import { ethers } from 'ethers'
import { getDetailsForEditingMembershipSettings } from '../utils/getDetailsForEditingMembershipSettings'
import { encodeLegacyUpdateRoleData, encodeUpdateRoleData } from '../utils/encodeUpdateRoleData'
import isEqual from 'lodash/isEqual'
import { CodeException } from '../errors'
import { UserOps } from '../UserOperations'

export async function editMembership(params: {
    spaceId: string
    updateRoleParams: UpdateRoleParams
    membershipParams: {
        pricingModule: string
        membershipPrice: ethers.BigNumberish // wei
        membershipSupply: ethers.BigNumberish
        freeAllocation?: ethers.BigNumberish
    }
    signer: ethers.Signer
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
}) {
    const { spaceId, spaceDapp, membershipParams, updateRoleParams, signer, sendUserOp } = params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const txs: {
        callData: string
        toAddress: string
    }[] = []

    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const {
        pricingModule: newPricingModule,
        membershipPrice: newMembershipPrice,
        membershipSupply: newMembershipSupply,
        freeAllocation: freeAllocation,
    } = membershipParams
    const newFreeAllocation = freeAllocation ?? 0

    const newRuleData = updateRoleParams.ruleData

    const { membershipInfo, roleEntitlements } = await getDetailsForEditingMembershipSettings({
        spaceDapp,
        spaceId,
        space,
    })

    ///////////////////////////////////////////////////////////////////////////////////
    //// update minter role ///////////////////////////////////////////////////////////
    const entitlementShims = await space.getEntitlementShims()
    if (!entitlementShims.length) {
        throw new Error('Rule entitlement not found')
    }
    if (roleEntitlements?.ruleData.kind === 'v1') {
        throw new Error('Cannot use update role params on a legacy space')
    }

    if (!isEqual(newRuleData, roleEntitlements?.ruleData.rules)) {
        const roleData = await encodeUpdateRoleData({
            space,
            updateRoleParams,
            spaceDapp,
        })

        txs.push({
            callData: roleData.callData,
            toAddress: space.Roles.address,
        })
    }

    ///////////////////////////////////////////////////////////////////////////////////
    //// update membership pricing ////////////////////////////////////////////////////
    const priceChanges = await evaluatePricingChanges({
        space,
        spaceDapp,
        spaceId,
        newPricingModule,
        newMembershipPrice,
        newFreeAllocation,
    })

    txs.push(...priceChanges)

    ///////////////////////////////////////////////////////////////////////////////////
    //// update membership limit ////////////////////////////////////////////////////
    const membershipLimitChanges = await evaluateMembershipLimitChanges({
        space,
        membershipInfo,
        newMembershipSupply,
    })
    txs.push(...membershipLimitChanges)

    return sendUserOp({
        toAddress: txs.map((tx) => tx.toAddress),
        callData: txs.map((tx) => tx.callData),
        signer: signer,
        spaceId,
        functionHashForPaymasterProxy: 'editMembershipSettings',
    })
}

export async function legacyEditMembership(params: {
    spaceId: string
    legacyUpdateRoleParams: LegacyUpdateRoleParams
    membershipParams: {
        pricingModule: string
        membershipPrice: ethers.BigNumberish // wei
        membershipSupply: ethers.BigNumberish
        freeAllocation?: ethers.BigNumberish
    }
    signer: ethers.Signer
    spaceDapp: SpaceDapp | undefined
    sendUserOp: UserOps['sendUserOp']
}) {
    const { spaceId, spaceDapp, membershipParams, legacyUpdateRoleParams, signer, sendUserOp } =
        params
    if (!spaceDapp) {
        throw new Error('spaceDapp is required')
    }
    const txs: {
        callData: string
        toAddress: string
    }[] = []

    const space = spaceDapp.getSpace(spaceId)

    if (!space) {
        throw new Error(`Space with spaceId "${spaceId}" is not found.`)
    }

    const {
        pricingModule: newPricingModule,
        membershipPrice: newMembershipPrice,
        membershipSupply: newMembershipSupply,
        freeAllocation: freeAllocation,
    } = membershipParams
    const newFreeAllocation = freeAllocation ?? 1

    const newRuleData = legacyUpdateRoleParams.ruleData
    const newUsers = legacyUpdateRoleParams.users

    const { membershipInfo, roleEntitlements } = await getDetailsForEditingMembershipSettings({
        spaceDapp,
        spaceId,
        space,
    })

    ///////////////////////////////////////////////////////////////////////////////////
    //// update minter role ///////////////////////////////////////////////////////////
    const entitlementShims = await space.getEntitlementShims()
    if (!entitlementShims.length) {
        throw new Error('Rule entitlement not found')
    }
    if (roleEntitlements?.ruleData.kind === 'v2') {
        throw new Error('Cannot use legacy update role params on a v2 space')
    }

    // TODO: why did this require a change? Once upon a time, the returned rule
    // data had no extra fields, but now it does.
    const updatedRuleData = {
        operations: roleEntitlements?.ruleData.rules.operations,
        checkOperations: roleEntitlements?.ruleData.rules.checkOperations,
        logicalOperations: roleEntitlements?.ruleData.rules.logicalOperations,
    }
    if (!isEqual(newRuleData, updatedRuleData)) {
        const newRuleDataIsNoop = isEqual(newRuleData, NoopRuleData)

        if (newRuleDataIsNoop && !newUsers.includes(EVERYONE_ADDRESS)) {
            throw new CodeException({
                message: 'Noop rule entitlement must be used with the everyone address',
                code: 'USER_OPS_NOOP_REQUIRES_EVERYONE',
                category: 'userop',
            })
        } else if (!newRuleDataIsNoop && newUsers.includes(EVERYONE_ADDRESS)) {
            throw new CodeException({
                message: 'Rule entitlements cannot be used with the everyone address',
                code: 'USER_OPS_RULES_CANNOT_BE_USED_WITH_EVERYONE',
                category: 'userop',
            })
        }

        const roleData = await encodeLegacyUpdateRoleData({
            space,
            legacyUpdateRoleParams: legacyUpdateRoleParams,
        })

        txs.push({
            callData: roleData.callData,
            toAddress: space.Roles.address,
        })
    }

    ///////////////////////////////////////////////////////////////////////////////////
    //// update membership pricing ////////////////////////////////////////////////////
    const priceChanges = await evaluatePricingChanges({
        space,
        spaceDapp,
        spaceId,
        newPricingModule,
        newMembershipPrice,
        newFreeAllocation,
    })

    txs.push(...priceChanges)

    ///////////////////////////////////////////////////////////////////////////////////
    //// update membership limit ////////////////////////////////////////////////////
    const membershipLimitChanges = await evaluateMembershipLimitChanges({
        space,
        membershipInfo,
        newMembershipSupply,
    })
    txs.push(...membershipLimitChanges)

    return sendUserOp({
        toAddress: txs.map((tx) => tx.toAddress),
        callData: txs.map((tx) => tx.callData),
        signer: signer,
        spaceId,
        functionHashForPaymasterProxy: 'editMembershipSettings',
    })
}

async function evaluatePricingChanges({
    space,
    spaceDapp,
    spaceId,
    newPricingModule,
    newMembershipPrice,
    newFreeAllocation,
}: {
    space: Space
    spaceDapp: SpaceDapp
    spaceId: string
    newPricingModule: string
    newMembershipPrice: ethers.BigNumberish
    newFreeAllocation: ethers.BigNumberish
}) {
    const txs: {
        callData: string
        toAddress: string
    }[] = []

    const pricingModules = await spaceDapp.listPricingModules()
    const fixedPricingModule = findFixedPricingModule(pricingModules)
    const dynamicPricingModule = findDynamicPricingModule(pricingModules)
    const currentFreeAllocation = await space.Membership.read.getMembershipFreeAllocation()
    const { price: currentMembershipPrice } = await spaceDapp.getJoinSpacePriceDetails(spaceId)

    if (!fixedPricingModule || !dynamicPricingModule) {
        throw new Error('Pricing modules not found')
    }

    const currentPricingModule = await space.Membership.read.getMembershipPricingModule()
    const currentIsFixedPricing =
        currentPricingModule.toLowerCase() ===
        (await fixedPricingModule.module).toString().toLowerCase()
    const newIsFixedPricing =
        newPricingModule.toLowerCase() ===
        (await fixedPricingModule.module).toString().toLowerCase()
    const newMembershipPriceBigNumber = ethers.BigNumber.from(newMembershipPrice)

    // To change a "free" (paid w/ price = 0 + freeAllocation > 0) membership to a paid membership:
    // 1. freeAllocation must be 0
    // 2. membership price must be set
    //
    // Cannot change a paid space to a free space (contract reverts)

    ////////////////////////////////////////////////////////////////////////////////
    // Free -> Paid ////////////////////////////////////////////////////////////////
    // fixed price of 0 ("free") to fixed price of non-zero
    if (
        currentIsFixedPricing &&
        currentFreeAllocation.toBigInt() > 0n &&
        newIsFixedPricing &&
        newMembershipPriceBigNumber.gt(0) &&
        newFreeAllocation === 0
    ) {
        const freeAllocationCallData = space.Membership.encodeFunctionData(
            'setMembershipFreeAllocation',
            [newFreeAllocation],
        )
        txs.push({
            callData: freeAllocationCallData,
            toAddress: space.Membership.address,
        })

        const membershipPriceCallData = space.Membership.encodeFunctionData('setMembershipPrice', [
            newMembershipPrice,
        ])
        txs.push({
            callData: membershipPriceCallData,
            toAddress: space.Membership.address,
        })
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Fixed -> Dynamic //////////////////////////////////////////////////////////
    // TODO: 3.5.2025 this was a revert in the past, unknown if it still is
    else if (currentIsFixedPricing && !newIsFixedPricing) {
        throw new CodeException({
            message: 'Cannot change a fixed pricing space to a dynamic pricing space',
            code: 'USER_OPS_CANNOT_CHANGE_TO_DYNAMIC_PRICING_SPACE',
            category: 'userop',
        })
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Dynamic -> Dynamic ////////////////////////////////////////////////////////
    else if (!currentIsFixedPricing && !newIsFixedPricing) {
        // do nothing
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Dynamic -> Fixed //////////////////////////////////////////////////////////
    // change pricing module + set new price
    else if (!currentIsFixedPricing && newIsFixedPricing) {
        const pricingModuleCallData = space.Membership.encodeFunctionData(
            'setMembershipPricingModule',
            [await fixedPricingModule.module],
        )
        txs.push({
            callData: pricingModuleCallData,
            toAddress: space.Membership.address,
        })
        const membershipPriceCallData = space.Membership.encodeFunctionData('setMembershipPrice', [
            newMembershipPrice,
        ])
        txs.push({
            callData: membershipPriceCallData,
            toAddress: space.Membership.address,
        })
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Price update only /////////////////////////////////////////////////////////
    else if (!currentMembershipPrice.eq(newMembershipPriceBigNumber)) {
        const membershipPriceCallData = space.Membership.encodeFunctionData('setMembershipPrice', [
            newMembershipPrice,
        ])
        txs.push({
            callData: membershipPriceCallData,
            toAddress: space.Membership.address,
        })
    }

    return txs
}

async function evaluateMembershipLimitChanges({
    space,
    membershipInfo,
    newMembershipSupply,
}: {
    space: Space
    membershipInfo: {
        maxSupply: ethers.BigNumberish
    }
    newMembershipSupply: ethers.BigNumberish
}) {
    const txs: {
        callData: string
        toAddress: string
    }[] = []

    if (
        !ethers.BigNumber.from(membershipInfo.maxSupply).eq(
            ethers.BigNumber.from(newMembershipSupply),
        )
    ) {
        const callData = space.Membership.encodeFunctionData('setMembershipLimit', [
            newMembershipSupply,
        ])
        txs.push({
            callData,
            toAddress: space.Membership.address,
        })
    }

    return txs
}
