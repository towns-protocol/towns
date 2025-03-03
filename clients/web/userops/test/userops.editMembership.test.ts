/* eslint-disable @typescript-eslint/no-base-to-string */
import {
    EVERYONE_ADDRESS,
    LocalhostWeb3Provider,
    NoopRuleData,
    Space,
    SpaceDapp,
    convertRuleDataV1ToV2,
    findFixedPricingModule,
} from '@river-build/web3'
import { Permission } from '@river-build/web3'
import {
    boredApeRuleData,
    createFixedPriceSpace,
    createGatedSpace,
    createSpaceDappAndUserops,
    createUngatedSpace,
    generatePrivyWalletIfKey,
    getSpaceId,
    sleepBetweenTxs,
    waitForOpAndTx,
    sendEditMembershipSettingsOp,
    encodeUpdateRoleData,
} from './utils'
import { vi } from 'vitest'
import { ethers } from 'ethers'
import { TestUserOps } from './TestUserOps'
import { getDetailsForEditingMembershipSettings } from '../src/utils/getDetailsForEditingMembershipSettings'

test('should update ungated minter role to gated', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(alice)

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')
    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt, alice.wallet.address, userOps)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated role data
    const sendEditOp = await sendEditMembershipSettingsOp(
        userOps,
        spaceId,
        {
            ...ogRoleData,
            users: [],
            ruleData: boredApeRuleData,
        },
        ogMembershipData,
        alice.wallet,
    )

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Roles.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        (
            await encodeUpdateRoleData(userOps, space!, spaceDapp, {
                ...ogRoleData,
                users: [],
                ruleData: boredApeRuleData,
            })
        ).callData,
    ])

    await waitForOpAndTx(sendEditOp, alice)

    const { roleData: updatedRoleData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })
    expect(updatedRoleData.users).toStrictEqual([])
    expect(updatedRoleData.ruleData?.rules.checkOperations[0].chainId.toString()).toBe(
        boredApeRuleData.checkOperations[0].chainId.toString(),
    )
    expect(
        updatedRoleData.ruleData?.rules.checkOperations[0].contractAddress.toString().toLowerCase(),
    ).toBe(boredApeRuleData.checkOperations[0].contractAddress.toString().toLowerCase())
})

test('should update gated minter role to everyone', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(alice)

    const createSpaceOp = await createGatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')
    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt, alice.wallet.address, userOps)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated role data
    const sendEditOp = await sendEditMembershipSettingsOp(
        userOps,
        spaceId,
        {
            ...ogRoleData,
            users: [EVERYONE_ADDRESS],
            ruleData: NoopRuleData,
        },
        ogMembershipData,
        alice.wallet,
    )

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Roles.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        (
            await encodeUpdateRoleData(userOps, space!, spaceDapp, {
                ...ogRoleData,
                users: [EVERYONE_ADDRESS],
                ruleData: NoopRuleData,
            })
        ).callData,
    ])

    await waitForOpAndTx(sendEditOp, alice)

    const { roleData: updatedRoleData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })
    expect(updatedRoleData.users).toStrictEqual([EVERYONE_ADDRESS])
    expect(updatedRoleData.ruleData.rules.checkOperations).toStrictEqual([])
})

test('should update "free" paid space to paid space', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt, alice.wallet.address, userOps)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    const pricingModules = await spaceDapp.listPricingModules()
    const fixedPricingModule = findFixedPricingModule(pricingModules)
    expect(fixedPricingModule).toBeDefined()

    // updated pricing module
    const sendEditPricingModuleOp = await sendEditMembershipSettingsOp(
        userOps,
        spaceId,
        {
            ...ogRoleData,
            ruleData:
                ogRoleData.ruleData.kind === 'v2'
                    ? ogRoleData.ruleData.rules
                    : convertRuleDataV1ToV2(ogRoleData.ruleData.rules),
        },
        {
            ...ogMembershipData,
            pricingModule: fixedPricingModule!.module as string,
            membershipPrice: ethers.utils.parseEther('0.1'),
            freeAllocation: 0,
        },
        alice.wallet,
    )

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([
        space!.Membership.address,
        space!.Membership.address,
    ])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        space!.Membership.encodeFunctionData('setMembershipFreeAllocation', [0]),
        space!.Membership.encodeFunctionData('setMembershipPrice', [
            ethers.utils.parseEther('0.1').toString(),
        ]),
    ])

    await waitForOpAndTx(sendEditPricingModuleOp, alice)
    await sleepBetweenTxs()

    const { membershipData: updatedPricingData1 } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })
    expect(updatedPricingData1.pricingModule).toBe(fixedPricingModule!.module)
    expect(ethers.BigNumber.from(updatedPricingData1.membershipPrice).toHexString()).toBe(
        ethers.utils.parseEther('0.1').toHexString(),
    )
})

test('should update membership price on a paid space', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createFixedPriceSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt, alice.wallet.address, userOps)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    expect(ethers.BigNumber.from(ogMembershipData.membershipPrice).toHexString()).toBe(
        ethers.utils.parseEther('0.5').toHexString(),
    )

    // updated membership pricing
    const sendEditOp = await sendEditMembershipSettingsOp(
        userOps,
        spaceId,
        {
            ...ogRoleData,
            ruleData:
                ogRoleData.ruleData.kind === 'v2'
                    ? ogRoleData.ruleData.rules
                    : convertRuleDataV1ToV2(ogRoleData.ruleData.rules),
        },
        {
            ...ogMembershipData,
            membershipPrice: ethers.utils.parseEther('0.1'),
        },
        alice.wallet,
    )

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Membership.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        space!.Membership.encodeFunctionData('setMembershipPrice', [
            ethers.utils.parseEther('0.1').toString(),
        ]),
    ])

    await waitForOpAndTx(sendEditOp, alice)

    const { membershipData: updatedMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })
    expect(ethers.BigNumber.from(updatedMembershipData.membershipPrice).toHexString()).toBe(
        ethers.utils.parseEther('0.1').toHexString(),
    )
})

test('should update limit on the membership', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt, alice.wallet.address, userOps)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated membership limit
    const sendEditOp = await sendEditMembershipSettingsOp(
        userOps,
        spaceId,
        {
            ...ogRoleData,
            ruleData:
                ogRoleData.ruleData.kind === 'v2'
                    ? ogRoleData.ruleData.rules
                    : convertRuleDataV1ToV2(ogRoleData.ruleData.rules),
        },
        {
            ...ogMembershipData,
            membershipSupply: 1_000_000,
        },
        alice.wallet,
    )

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Membership.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        space!.Membership.encodeFunctionData('setMembershipLimit', [1_000_000]),
    ])

    await waitForOpAndTx(sendEditOp, alice)

    const { membershipData: updatedMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })
    expect(+updatedMembershipData.membershipSupply.toString()).toBe(1_000_000)
})

async function getMembershipData({
    spaceDapp,
    spaceId,
    space,
}: {
    spaceId: string
    space: Space | undefined
    spaceDapp: SpaceDapp
    userOps: TestUserOps
}) {
    if (!space) {
        throw new Error('Space is required')
    }
    const { membershipInfo, roleEntitlements, freeAllocation } =
        await getDetailsForEditingMembershipSettings({
            spaceDapp,
            spaceId,
            space,
        })

    expect(roleEntitlements).toBeDefined()

    const _role = await spaceDapp.getRole(spaceId, 1)
    expect(_role).toBeDefined()

    const role = _role
    const roleData = {
        spaceNetworkId: spaceId,
        roleId: role!.id,
        roleName: role!.name,
        permissions: role!.permissions,
        users: role!.users,
        ruleData: roleEntitlements!.ruleData,
    }

    const membershipData = {
        pricingModule: membershipInfo.pricingModule,
        membershipPrice: membershipInfo.price as ethers.BigNumberish,
        membershipSupply: membershipInfo.maxSupply as ethers.BigNumberish,
        freeAllocation: freeAllocation,
    }

    return { roleData, membershipData }
}
