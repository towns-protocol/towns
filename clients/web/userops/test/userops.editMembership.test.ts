import {
    ISpaceDapp,
    LocalhostWeb3Provider,
    NoopRuleData,
    Space,
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
} from './utils'
import { vi } from 'vitest'
import { ethers } from 'ethers'
import { TestUserOps } from './TestUserOps'
import { EVERYONE_ADDRESS } from '../src/utils'

test('should update ungated minter role to gated', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')
    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated role data
    const sendEditOp = await userOps.sendEditMembershipSettingsOp({
        spaceId,
        updateRoleParams: {
            ...ogRoleData,
            users: [],
            ruleData: boredApeRuleData,
        },
        membershipParams: ogMembershipData,
        signer: alice.wallet,
    })

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Roles.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        (
            await userOps.encodeUpdateRoleData({
                space: space!,
                updateRoleParams: {
                    ...ogRoleData,
                    users: [],
                    ruleData: boredApeRuleData,
                },
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
    expect(updatedRoleData.ruleData.checkOperations[0].chainId.toString()).toBe(
        boredApeRuleData.checkOperations[0].chainId.toString(),
    )
    expect(
        updatedRoleData.ruleData.checkOperations[0].contractAddress.toString().toLowerCase(),
    ).toBe(boredApeRuleData.checkOperations[0].contractAddress.toString().toLowerCase())
})

test('should update gated minter role to everyone', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const createSpaceOp = await createGatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')
    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated role data
    const sendEditOp = await userOps.sendEditMembershipSettingsOp({
        spaceId,
        updateRoleParams: {
            ...ogRoleData,
            users: [EVERYONE_ADDRESS],
            ruleData: NoopRuleData,
        },
        membershipParams: ogMembershipData,
        signer: alice.wallet,
    })

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Roles.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        (
            await userOps.encodeUpdateRoleData({
                space: space!,
                updateRoleParams: {
                    ...ogRoleData,
                    users: [EVERYONE_ADDRESS],
                    ruleData: NoopRuleData,
                },
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
    expect(updatedRoleData.ruleData.checkOperations).toStrictEqual([])
})

test('should update free space to paid space', async () => {
    const alice = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(process.env.PRIVY_WALLET_PRIVATE_KEY_1),
    )
    await alice.ready

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt)
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
    const sendEditPricingModuleOp = await userOps.sendEditMembershipSettingsOp({
        spaceId,
        updateRoleParams: ogRoleData,
        membershipParams: {
            ...ogMembershipData,
            pricingModule: fixedPricingModule!.module as string,
            membershipPrice: ethers.utils.parseEther('0.1'),
        },
        signer: alice.wallet,
    })

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([
        space!.Membership.address,
        space!.Membership.address,
        space!.Membership.address,
    ])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        await space!.Membership.encodeFunctionData('setMembershipPricingModule', [
            fixedPricingModule!.module,
        ]),
        await space!.Membership.encodeFunctionData('setMembershipFreeAllocation', [1]),
        await space!.Membership.encodeFunctionData('setMembershipPrice', [
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

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createFixedPriceSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt)
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
    const sendEditOp = await userOps.sendEditMembershipSettingsOp({
        spaceId,
        updateRoleParams: ogRoleData,
        membershipParams: {
            ...ogMembershipData,
            membershipPrice: ethers.utils.parseEther('0.1'),
        },
        signer: alice.wallet,
    })

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Membership.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        await space!.Membership.encodeFunctionData('setMembershipPrice', [
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

    const { spaceDapp, userOps } = createSpaceDappAndUserops(alice)

    const sendSpy = vi.spyOn(userOps, 'sendUserOp')

    const createSpaceOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: alice.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const createSpaceTxReceipt = await waitForOpAndTx(createSpaceOp, alice)
    await sleepBetweenTxs()

    const spaceId = await getSpaceId(spaceDapp, createSpaceTxReceipt)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const { roleData: ogRoleData, membershipData: ogMembershipData } = await getMembershipData({
        spaceDapp,
        spaceId,
        space,
        userOps,
    })

    // updated membership limit
    const sendEditOp = await userOps.sendEditMembershipSettingsOp({
        spaceId,
        updateRoleParams: ogRoleData,
        membershipParams: {
            ...ogMembershipData,
            membershipSupply: 1_000_000,
        },
        signer: alice.wallet,
    })

    // make sure only sending operation with changed data
    const lastSendOpCall = sendSpy.mock.lastCall
    expect(lastSendOpCall?.[0].toAddress).toStrictEqual([space!.Membership.address])
    expect(lastSendOpCall?.[0].callData).toStrictEqual([
        await space!.Membership.encodeFunctionData('setMembershipLimit', [1_000_000]),
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
    userOps,
    spaceId,
    space,
}: {
    spaceId: string
    space: Space | undefined
    spaceDapp: ISpaceDapp
    userOps: TestUserOps
}) {
    const { membershipInfo, roleEntitlements } =
        await userOps.getDetailsForEditingMembershipSettings(spaceId, space!)

    expect(roleEntitlements).toBeDefined()

    const _role = await spaceDapp.getRole(spaceId, 1)
    expect(_role).toBeDefined()

    const role = _role!
    const roleData = {
        spaceNetworkId: spaceId,
        roleId: role.id,
        roleName: role.name,
        permissions: role.permissions,
        users: role.users,
        ruleData: roleEntitlements!.ruleData,
    }

    const membershipData = {
        pricingModule: membershipInfo.pricingModule as string,
        membershipPrice: membershipInfo.price as ethers.BigNumberish,
        membershipSupply: membershipInfo.maxSupply as ethers.BigNumberish,
    }

    return { roleData, membershipData }
}
