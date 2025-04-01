import {
    ETH_ADDRESS,
    EVERYONE_ADDRESS,
    LocalhostWeb3Provider,
    NoopRuleData,
    Permission,
    SpaceAddressFromSpaceId,
    SpaceDapp,
} from '@towns-protocol/web3'
import {
    boredApeRuleData,
    createSpaceDappAndUserops,
    createUngatedSpace,
    fundWallet,
    generatePrivyWalletIfKey,
    getSpaceId,
    waitForOpAndTx,
} from './utils'
import { entryPoint06Address, entryPoint07Address } from 'viem/account-abstraction'
import { ERC4337 } from '../src/constants'
import { determineSmartAccount } from '../src/lib/permissionless/accounts/determineSmartAccount'
import { ownerAbi } from '../src/lib/permissionless/accounts/simple/abi'
import { http, createPublicClient, parseEther, Address } from 'viem'
import { foundry } from 'viem/chains'
import { Wallet } from 'ethers'
import { TestUserOps } from './TestUserOps'
import { semiModularAccountBytecodeAbi } from '../src/lib/permissionless/accounts/modular/abis/semiModularBytecodeAbi'
import { makeUniqueChannelStreamId } from '@towns-protocol/sdk'
import { getDetailsForEditingMembershipSettings } from '../src/utils/getDetailsForEditingMembershipSettings'

const publicClient = createPublicClient({
    chain: foundry,
    transport: http(process.env.AA_RPC_URL as string),
})

const userWithDeployedSimpleAccount = async () => {
    const prov = new LocalhostWeb3Provider(
        process.env.AA_RPC_URL as string,
        generatePrivyWalletIfKey(),
    )
    const ownerWallet = prov.wallet
    const { spaceDapp, userOps } = await createSpaceDappAndUserops(prov, 'simple')

    const client = await userOps.getSmartAccountClient({ signer: prov.wallet })
    expect(client.entrypointAddress).toBe(entryPoint06Address)
    expect(client.factoryAddress).toBe(ERC4337.SimpleAccount.Factory)

    const code = await prov.getCode(client.address)
    expect(code).toBe('0x')
    // do a tx and deploy the account
    const op = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: prov.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const opReceipt = await op.getUserOperationReceipt()
    expect(opReceipt?.success).toBe(true)
    const txReceipt = await waitForOpAndTx(op, prov)
    const spaceId = await getSpaceId(spaceDapp, txReceipt, prov.wallet.address, userOps)
    const code2 = await prov.getCode(client.address)
    expect(code2).not.toBe('0x')

    // this abi does not exist on modular accounts
    const owner = await publicClient.readContract({
        address: client.address,
        abi: ownerAbi,
        functionName: 'owner',
    })

    expect(owner).toBe(ownerWallet.address)

    // old accounts would have been deployed
    const deploymentData = await determineSmartAccount({
        newAccountImplementationType: 'simple',
        ownerAddress: ownerWallet.address as `0x${string}`,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL as string,
        paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET as string,
    })

    expect(deploymentData).toBeDefined()
    expect(deploymentData.accountType).toBe('simple')

    return { prov, client, spaceDapp, userOps, spaceId }
}

const userThatNeedsUpgrade = async (args: {
    wallet: Wallet
    numberOfLinkedWalletsBeforeUpgrade?: number
    numberOfLinkedWalletsAfterUpgrade?: number
    operation: (args: {
        userOps: TestUserOps
        spaceDapp: SpaceDapp
        signer: Wallet
    }) => Promise<void>
}) => {
    const {
        wallet,
        numberOfLinkedWalletsBeforeUpgrade,
        numberOfLinkedWalletsAfterUpgrade,
        operation,
    } = args
    const prov = new LocalhostWeb3Provider(process.env.AA_RPC_URL as string, wallet)

    const { spaceDapp, userOps } = await createSpaceDappAndUserops(prov, 'modular')
    const ownerWallet = prov.wallet
    const linkedWallets = await spaceDapp.getLinkedWallets(ownerWallet.address)
    // linked wallets includes the root key, + smart account
    expect(linkedWallets.length).toBe(numberOfLinkedWalletsBeforeUpgrade ?? 2)
    const aaAddress = (await userOps.getSmartAccountClient({ signer: prov.wallet })).address
    expect(linkedWallets).toContain(aaAddress)
    expect(linkedWallets).toContain(ownerWallet.address)

    //////////////////////////////////////////////////////////////
    // double check that the account we're dealing with is a simple account
    //////////////////////////////////////////////////////////////
    const clientBeforeUpgrade = await userOps.getSmartAccountClient({ signer: prov.wallet })
    expect(clientBeforeUpgrade.entrypointAddress).toBe(entryPoint06Address)
    expect(clientBeforeUpgrade.factoryAddress).toBe(ERC4337.SimpleAccount.Factory)

    const code2 = await prov.getCode(clientBeforeUpgrade.address)
    expect(code2).not.toBe('0x')

    // this abi does not exist on modular accounts so it would throw if not a simple account
    const owner = await publicClient.readContract({
        address: clientBeforeUpgrade.address,
        abi: ownerAbi,
        functionName: 'owner',
    })

    expect(owner).toBe(ownerWallet.address)

    //////////////////////////////////////////////////////////////
    // now perform the batched userop that includes the upgrade
    //////////////////////////////////////////////////////////////

    await operation({ userOps, spaceDapp, signer: prov.wallet })

    //////////////////////////////////////////////////////////////
    // check that the account is now modular
    //////////////////////////////////////////////////////////////
    const clientAfterUpgrade = await userOps.getSmartAccountClient({ signer: prov.wallet })

    expect(clientAfterUpgrade.entrypointAddress).toBe(entryPoint07Address)
    expect(clientAfterUpgrade.factoryAddress).toBe(ERC4337.ModularAccount.Factory)

    const code3 = await prov.getCode(clientAfterUpgrade.address)
    expect(code3).not.toBe('0x')

    const [modularOwnerAddress] = await publicClient.readContract({
        address: clientAfterUpgrade.address,
        abi: semiModularAccountBytecodeAbi,
        functionName: 'getFallbackSignerData',
    })

    expect(modularOwnerAddress).toBe(ownerWallet.address)
    expect(clientBeforeUpgrade.address).toBe(clientAfterUpgrade.address)

    const linkedWalletsAfterUpgrade = await spaceDapp.getLinkedWallets(ownerWallet.address)
    expect(linkedWalletsAfterUpgrade.length).toBe(numberOfLinkedWalletsAfterUpgrade ?? 2)
    const aaAddressAfterUpgrade = (await userOps.getSmartAccountClient({ signer: prov.wallet }))
        .address
    expect(linkedWalletsAfterUpgrade).toContain(aaAddressAfterUpgrade)

    //////////////////////////////////////////////////////////////
    // perform another tx
    //////////////////////////////////////////////////////////////
    const postUpgradeOp = await createUngatedSpace({
        userOps,
        spaceDapp,
        signer: prov.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const opReceipt = await postUpgradeOp.getUserOperationReceipt()
    expect(opReceipt?.success).toBe(true)
}

test('can upgrade during createSpace', async () => {
    const { prov } = await userWithDeployedSimpleAccount()

    await userThatNeedsUpgrade({
        wallet: prov.wallet,
        operation: async ({ userOps, spaceDapp }) => {
            const op = await createUngatedSpace({
                userOps,
                spaceDapp,
                signer: prov.wallet,
                rolePermissions: [Permission.Read, Permission.Write],
            })
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during joinSpace on a free space', async () => {
    const {
        prov: bob,
        userOps: bobUserOps,
        spaceDapp: bobSpaceDapp,
    } = await userWithDeployedSimpleAccount()
    const { prov: alice, userOps: aliceUserOps } = await userWithDeployedSimpleAccount()

    const newSpaceOp = await createUngatedSpace({
        userOps: bobUserOps,
        spaceDapp: bobSpaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const useropReceipt = await newSpaceOp.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)
    const txReceipt = await waitForOpAndTx(newSpaceOp, bob)

    // fund alice so she can join the space
    await fundWallet(
        (await aliceUserOps.getAbstractAccountAddress({
            rootKeyAddress: alice.wallet.address as `0x${string}`,
        })) ?? '',
        alice,
    )
    const spaceId = await getSpaceId(bobSpaceDapp, txReceipt, bob.wallet.address, bobUserOps)

    await userThatNeedsUpgrade({
        wallet: alice.wallet,
        operation: async ({ userOps }) => {
            const smClient = await userOps.getSmartAccountClient({ signer: alice.wallet })
            const op = await userOps.sendJoinSpaceOp([spaceId, smClient.address, alice.wallet])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during joinSpace on a paid space', async () => {
    const {
        prov: bob,
        userOps: bobUserOps,
        spaceDapp: bobSpaceDapp,
    } = await userWithDeployedSimpleAccount()
    const { prov: alice, userOps: aliceUserOps } = await userWithDeployedSimpleAccount()

    const newSpaceOp = await createUngatedSpace({
        userOps: bobUserOps,
        spaceDapp: bobSpaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
        membershipPrice: parseEther('0.1'),
        freeAllocation: 0,
    })

    const useropReceipt = await newSpaceOp.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)
    const txReceipt = await waitForOpAndTx(newSpaceOp, bob)

    // fund alice so she can join the space
    await fundWallet(
        (await aliceUserOps.getAbstractAccountAddress({
            rootKeyAddress: alice.wallet.address as `0x${string}`,
        })) ?? '',
        alice,
    )
    const spaceId = await getSpaceId(bobSpaceDapp, txReceipt, bob.wallet.address, bobUserOps)

    await userThatNeedsUpgrade({
        wallet: alice.wallet,
        operation: async ({ userOps }) => {
            const smClient = await userOps.getSmartAccountClient({ signer: alice.wallet })
            const op = await userOps.sendJoinSpaceOp([spaceId, smClient.address, alice.wallet])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during banning', async () => {
    const { spaceMember, spaceOwner, spaceDapp, spaceId } = await setupPrexistingUsersAndASpace()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps }) => {
            const op = await userOps.sendBanWalletAddressOp([
                spaceId,
                spaceMember.wallet.address,
                spaceOwner.wallet,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)

            const bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
            expect(bannedWalletAddresses).toContain(spaceMember.wallet.address)
        },
    })
})

test('can upgrade during unbanning', async () => {
    const { spaceMember, spaceOwner, spaceOwnerUserOps, spaceDapp, spaceId } =
        await setupPrexistingUsersAndASpace()

    const op = await spaceOwnerUserOps.sendBanWalletAddressOp([
        spaceId,
        spaceMember.wallet.address,
        spaceOwner.wallet,
    ])
    const useropReceipt = await op.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)

    const bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
    expect(bannedWalletAddresses).toContain(spaceMember.wallet.address)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps }) => {
            const op = await userOps.sendUnbanWalletAddressOp([
                spaceId,
                spaceMember.wallet.address,
                spaceOwner.wallet,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)

            const bannedWalletAddresses = await spaceDapp.bannedWalletAddresses(spaceId)
            expect(bannedWalletAddresses).not.toContain(spaceMember.wallet.address)
        },
    })
})

test('can upgrade during check in', async () => {
    const { spaceMember, spaceMemberSmartAccount } = await setupPrexistingUsersAndASpace()

    await fundWallet(spaceMemberSmartAccount.address, spaceMember)

    await userThatNeedsUpgrade({
        wallet: spaceMember.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendCheckInOp([signer])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during channel creation', async () => {
    const { spaceOwner, spaceId } = await setupPrexistingUsersAndASpace()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendCreateChannelOp([
                spaceId,
                'name',
                'description',
                makeUniqueChannelStreamId(spaceId),
                [],
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during channel update', async () => {
    const { spaceOwner, spaceId, spaceOwnerUserOps, spaceDapp } =
        await setupPrexistingUsersAndASpace()

    const op = await spaceOwnerUserOps.sendCreateChannelOp([
        spaceId,
        'name',
        'description',
        makeUniqueChannelStreamId(spaceId),
        [],
        spaceOwner.wallet,
    ])
    const useropReceipt = await op.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)

    const channels = await spaceDapp.getChannels(spaceId)
    const createdChannel = channels.find((c) => c.name === 'name')
    expect(createdChannel).toBeDefined()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendUpdateChannelOp([
                {
                    spaceId,
                    channelId: createdChannel!.channelNetworkId,
                    channelName: 'new name',
                    channelDescription: '',
                    roleIds: [],
                },
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during clear channel permission overrides', async () => {
    const { spaceOwner, spaceId, spaceOwnerUserOps, spaceDapp } =
        await setupPrexistingUsersAndASpace()

    const op = await spaceOwnerUserOps.sendCreateChannelOp([
        spaceId,
        'name',
        'description',
        makeUniqueChannelStreamId(spaceId),
        [],
        spaceOwner.wallet,
    ])
    const useropReceipt = await op.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)

    const channels = await spaceDapp.getChannels(spaceId)
    const createdChannel = channels.find((c) => c.name === 'name')
    expect(createdChannel).toBeDefined()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendClearChannelPermissionOverridesOp([
                {
                    spaceNetworkId: spaceId,
                    channelId: createdChannel!.channelNetworkId,
                    roleId: 1,
                },
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during set channel permission overrides', async () => {
    const { spaceOwner, spaceId, spaceOwnerUserOps, spaceDapp } =
        await setupPrexistingUsersAndASpace()

    const op = await spaceOwnerUserOps.sendCreateChannelOp([
        spaceId,
        'name',
        'description',
        makeUniqueChannelStreamId(spaceId),
        [],
        spaceOwner.wallet,
    ])
    const useropReceipt = await op.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)

    const channels = await spaceDapp.getChannels(spaceId)
    const createdChannel = channels.find((c) => c.name === 'name')
    expect(createdChannel).toBeDefined()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendSetChannelPermissionOverridesOp([
                {
                    spaceNetworkId: spaceId,
                    channelId: createdChannel!.channelNetworkId,
                    permissions: [Permission.Read],
                    roleId: 1,
                },
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during create role', async () => {
    const { spaceOwner, spaceId } = await setupPrexistingUsersAndASpace()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendCreateRoleOp([
                spaceId,
                'New Role',
                [Permission.Read],
                [EVERYONE_ADDRESS],
                NoopRuleData,
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})
test('can upgrade during update role', async () => {
    const { spaceOwner, spaceId, spaceOwnerUserOps, spaceDapp } =
        await setupPrexistingUsersAndASpace()
    const ROLE_NAME = 'role_name'

    const createRoleOp = await spaceOwnerUserOps.sendCreateRoleOp([
        spaceId,
        ROLE_NAME,
        [Permission.Read],
        [EVERYONE_ADDRESS],
        NoopRuleData,
        spaceOwner.wallet,
    ])
    const createRoleReceipt = await createRoleOp.getUserOperationReceipt()
    expect(createRoleReceipt?.success).toBe(true)

    const roles = await spaceDapp.getRoles(spaceId)
    const role = roles.find((r) => r.name === ROLE_NAME)
    expect(role).toBeDefined()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendUpdateRoleOp([
                {
                    spaceNetworkId: spaceId,
                    roleId: role!.roleId,
                    roleName: 'new role name',
                    permissions: [Permission.Read, Permission.Write],
                    users: [EVERYONE_ADDRESS],
                    ruleData: NoopRuleData,
                },
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during delete role', async () => {
    const { spaceOwner, spaceId, spaceOwnerUserOps, spaceDapp } =
        await setupPrexistingUsersAndASpace()
    const ROLE_NAME = 'role_name'

    const createRoleOp = await spaceOwnerUserOps.sendCreateRoleOp([
        spaceId,
        ROLE_NAME,
        [Permission.Read],
        [EVERYONE_ADDRESS],
        NoopRuleData,
        spaceOwner.wallet,
    ])
    const createRoleReceipt = await createRoleOp.getUserOperationReceipt()
    expect(createRoleReceipt?.success).toBe(true)

    const roles = await spaceDapp.getRoles(spaceId)
    const role = roles.find((r) => r.name === ROLE_NAME)
    expect(role).toBeDefined()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendDeleteRoleOp([spaceId, role!.roleId, signer])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)

            // Verify role was deleted
            const deletedRole = await spaceDapp.getRole(spaceId, role!.roleId)
            expect(deletedRole).toBeNull()
        },
    })
})

test('can upgrade during edit membership settings', async () => {
    const { spaceOwner, spaceId, spaceDapp } = await setupPrexistingUsersAndASpace()

    const role = await spaceDapp.getRole(spaceId, 1)
    expect(role).toBeDefined()

    const roleData = {
        spaceNetworkId: spaceId,
        roleId: role!.id,
        roleName: role!.name,
        permissions: role!.permissions,
        users: role!.users,
        ruleData: role!.ruleData,
    }

    const space = spaceDapp.getSpace(spaceId)

    const { membershipInfo, freeAllocation } = await getDetailsForEditingMembershipSettings({
        spaceDapp,
        spaceId,
        space: space!,
    })

    const membershipData = {
        pricingModule: membershipInfo.pricingModule,
        membershipPrice: membershipInfo.price,
        membershipSupply: membershipInfo.maxSupply,
        freeAllocation: freeAllocation,
    }

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendEditMembershipSettingsOp({
                spaceId,
                updateRoleParams: {
                    ...roleData,
                    users: [],
                    ruleData: boredApeRuleData,
                },
                membershipParams: {
                    ...membershipData,
                    membershipSupply: 1_000,
                    freeAllocation: 1,
                },
                signer,
            })
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during EOA link', async () => {
    const { spaceOwner, spaceDapp } = await setupPrexistingUsersAndASpace()
    const metamaskWallet = Wallet.createRandom().connect(spaceDapp.provider)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        numberOfLinkedWalletsAfterUpgrade: 3,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendLinkEOAToRootKeyOp([signer, metamaskWallet])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during EOA unlink', async () => {
    const { spaceOwner, spaceDapp, spaceOwnerUserOps } = await setupPrexistingUsersAndASpace()

    const metamaskWallet = Wallet.createRandom().connect(spaceDapp.provider)

    const linkOp = await spaceOwnerUserOps.sendLinkEOAToRootKeyOp([
        spaceOwner.wallet,
        metamaskWallet,
    ])
    const useropReceipt = await linkOp.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)

    const wallets = await spaceDapp.walletLink.getLinkedWallets(spaceOwner.wallet.address)
    expect(wallets).toContain(metamaskWallet.address)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        numberOfLinkedWalletsBeforeUpgrade: 3,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendRemoveWalletLinkOp([signer, metamaskWallet.address])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)

            const updatedWallets = await spaceDapp.walletLink.getLinkedWallets(signer.address)
            expect(updatedWallets).not.toContain(metamaskWallet.address)
        },
    })
})

test('can upgrade during addition of prepaid seats', async () => {
    const { spaceOwner, spaceId, spaceOwnerSmartAccount } = await setupPrexistingUsersAndASpace()

    await fundWallet(spaceOwnerSmartAccount.address, spaceOwner)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendPrepayMembershipOp([spaceId, 1, signer])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during metadata refresh', async () => {
    const { spaceOwner, spaceId } = await setupPrexistingUsersAndASpace()

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.refreshMetadata([spaceId, signer])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during review', async () => {
    const { spaceOwner, spaceId, spaceOwnerSmartAccount } = await setupPrexistingUsersAndASpace()
    await fundWallet(spaceOwnerSmartAccount.address, spaceOwner)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const reviewParams = {
                spaceId,
                rating: 5,
                comment: 'Great space!',
                signer,
                senderAddress: signer.address,
            }

            const op = await userOps.sendReviewOp([reviewParams, signer])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during tipping', async () => {
    const { spaceOwner, spaceMember, spaceId, spaceDapp, spaceOwnerSmartAccount } =
        await setupPrexistingUsersAndASpace()

    await fundWallet(spaceOwnerSmartAccount.address, spaceOwner)

    const tokenId = await spaceDapp.getTokenIdOfOwner(spaceId, spaceMember.wallet.address, {
        supportedRpcUrls: [],
        etherNativeNetworkIds: [],
        ethereumNetworkIds: [],
    })

    expect(tokenId).toBeDefined()

    const messageId = '0x' + '1'.repeat(64)
    const channelId = '0x' + '2'.repeat(64)
    const tipAmount = parseEther('0.01')

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendTipOp([
                {
                    spaceId,
                    receiver: spaceMember.wallet.address,
                    tokenId: tokenId!,
                    currency: ETH_ADDRESS,
                    amount: tipAmount,
                    messageId,
                    channelId,
                },
                signer,
            ])

            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during eth transfer', async () => {
    const { spaceOwner, spaceOwnerSmartAccount } = await setupPrexistingUsersAndASpace()

    await fundWallet(spaceOwnerSmartAccount.address, spaceOwner)

    const randomWallet = Wallet.createRandom().connect(spaceOwner)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendTransferEthOp(
                {
                    recipient: randomWallet.address,
                    value: parseEther('0.01'),
                },
                signer,
            )
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during NFT transfer', async () => {
    const { spaceOwner, spaceId, spaceDapp, spaceOwnerSmartAccount } =
        await setupPrexistingUsersAndASpace()

    await fundWallet(spaceOwnerSmartAccount.address, spaceOwner)

    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const randomWallet = Wallet.createRandom().connect(spaceDapp.provider)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const tokenId = await spaceDapp.getTokenIdOfOwner(spaceId, signer.address, {
                supportedRpcUrls: [],
                etherNativeNetworkIds: [],
                ethereumNetworkIds: [],
            })

            expect(tokenId).toBeDefined()

            const op = await userOps.sendTransferAssetsOp(
                {
                    contractAddress: space!.Membership.address,
                    recipient: randomWallet.address,
                    tokenId: tokenId!,
                },
                signer,
            )

            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)

            const hasSpaceMembership = await spaceDapp.hasSpaceMembership(
                spaceId,
                randomWallet.address,
            )
            expect(hasSpaceMembership).toBe(true)
        },
    })
})

test('can upgrade during withdraw space treasury', async () => {
    const { spaceOwner, spaceId, spaceOwnerSmartAccount, spaceDapp } =
        await setupPrexistingUsersAndASpace()

    const spaceAddress = SpaceAddressFromSpaceId(spaceId)

    await fundWallet(spaceAddress, spaceOwner)
    expect((await spaceDapp.provider.getBalance(spaceAddress)).toBigInt()).toBeGreaterThan(0n)

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendWithdrawSpaceFundsOp([
                spaceId,
                spaceOwnerSmartAccount.address,
                signer,
            ])
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade during space info update', async () => {
    const { spaceOwner, spaceId } = await setupPrexistingUsersAndASpace()

    const newSpaceName = 'Upgraded Space Name'

    await userThatNeedsUpgrade({
        wallet: spaceOwner.wallet,
        operation: async ({ userOps, signer }) => {
            const op = await userOps.sendUpdateSpaceInfoOp([
                spaceId,
                newSpaceName,
                'uri',
                'shortDescription',
                'longDescription',
                signer,
            ])

            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })
})

test('can upgrade independently and then perform a operation', async () => {
    // had a session where flag was set to simple
    const { spaceOwner } = await setupPrexistingUsersAndASpace()

    // loaded a new session where flag is set to modular
    const { spaceDapp, userOps } = await createSpaceDappAndUserops(spaceOwner, 'modular')

    //////////////////////////////////////////////////////////////
    // double check that the account we're dealing with is a simple account
    //////////////////////////////////////////////////////////////
    const clientBeforeUpgrade = await userOps.getSmartAccountClient({
        signer: spaceOwner.wallet,
    })
    expect(clientBeforeUpgrade.entrypointAddress).toBe(entryPoint06Address)
    expect(clientBeforeUpgrade.factoryAddress).toBe(ERC4337.SimpleAccount.Factory)

    const code2 = await spaceOwner.getCode(clientBeforeUpgrade.address)
    expect(code2).not.toBe('0x')

    // this abi does not exist on modular accounts so it would throw if not a simple account
    const owner = await publicClient.readContract({
        address: clientBeforeUpgrade.address,
        abi: ownerAbi,
        functionName: 'owner',
    })

    expect(owner).toBe(spaceOwner.wallet.address)

    const upgradeOp = await userOps.sendUpgradeToAndCallOp({ signer: spaceOwner.wallet })
    const upgradeOpReceipt = await upgradeOp.getUserOperationReceipt()
    expect(upgradeOpReceipt?.success).toBe(true)

    //////////////////////////////////////////////////////////////
    // check that the account is now modular
    //////////////////////////////////////////////////////////////
    const clientAfterUpgrade = await userOps.getSmartAccountClient({
        signer: spaceOwner.wallet,
    })

    expect(clientAfterUpgrade.entrypointAddress).toBe(entryPoint07Address)
    expect(clientAfterUpgrade.factoryAddress).toBe(ERC4337.ModularAccount.Factory)

    const code3 = await spaceOwner.getCode(clientAfterUpgrade.address)
    expect(code3).not.toBe('0x')

    const [modularOwnerAddress] = await publicClient.readContract({
        address: clientAfterUpgrade.address,
        abi: semiModularAccountBytecodeAbi,
        functionName: 'getFallbackSignerData',
    })

    expect(modularOwnerAddress).toBe(spaceOwner.wallet.address)
    expect(clientBeforeUpgrade.address).toBe(clientAfterUpgrade.address)

    const linkedWalletsAfterUpgrade = await spaceDapp.getLinkedWallets(spaceOwner.wallet.address)
    expect(linkedWalletsAfterUpgrade.length).toBe(2)
    const aaAddressAfterUpgrade = (
        await userOps.getSmartAccountClient({
            signer: spaceOwner.wallet,
        })
    ).address
    expect(linkedWalletsAfterUpgrade).toContain(aaAddressAfterUpgrade)

    //////////////////////////////////////////////////////////////
    // perform another tx
    //////////////////////////////////////////////////////////////
    const postUpgradeOp = await createUngatedSpace({
        userOps: userOps,
        spaceDapp,
        signer: spaceOwner.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const opReceipt = await postUpgradeOp.getUserOperationReceipt()
    expect(opReceipt?.success).toBe(true)
})

test('address with prior assets retains assets after upgrade', async () => {
    // loaded a new session where flag is set to simple
    const { prov, spaceId } = await userWithDeployedSimpleAccount()

    // loaded a new session where flag is set to modular
    const { userOps, spaceDapp } = await createSpaceDappAndUserops(prov, 'modular')

    const aaAddressPreUpgrade = await userOps.getAbstractAccountAddress({
        rootKeyAddress: prov.wallet.address as Address,
    })
    expect(aaAddressPreUpgrade).toBeDefined()
    await fundWallet(aaAddressPreUpgrade!, prov)
    const space = spaceDapp.getSpace(spaceId)
    expect(space).toBeDefined()

    const hasMembership = await space?.Membership.hasMembership(aaAddressPreUpgrade!)
    expect(hasMembership).toBe(true)

    expect((await prov.getBalance(aaAddressPreUpgrade!)).toBigInt()).toBe(parseEther('1'))

    await userThatNeedsUpgrade({
        wallet: prov.wallet,
        operation: async ({ userOps, spaceDapp }) => {
            const op = await createUngatedSpace({
                userOps,
                spaceDapp,
                signer: prov.wallet,
                rolePermissions: [Permission.Read, Permission.Write],
            })
            const useropReceipt = await op.getUserOperationReceipt()
            expect(useropReceipt?.success).toBe(true)
        },
    })

    const aaAddressPostUpgrade = await userOps.getAbstractAccountAddress({
        rootKeyAddress: prov.wallet.address as Address,
    })
    expect(aaAddressPostUpgrade).toBeDefined()
    expect(aaAddressPostUpgrade).toBe(aaAddressPreUpgrade)
    expect((await userOps.getSmartAccountClient({ signer: prov.wallet })).entrypointAddress).toBe(
        entryPoint07Address,
    )
    const hasMembershipPostUpgrade = await space?.Membership.hasMembership(aaAddressPostUpgrade!)
    expect(hasMembershipPostUpgrade).toBe(true)
    expect((await prov.getBalance(aaAddressPostUpgrade!)).toBigInt()).toBe(parseEther('1'))
})

test('sending a userop with a simple account after upgrade results in an error', async () => {
    const { spaceOwner, spaceOwnerUserOps, spaceDapp } = await setupPrexistingUsersAndASpace()
    const originalClient = await spaceOwnerUserOps.getSmartAccountClient({
        signer: spaceOwner.wallet,
    })

    const upgradeOp = await spaceOwnerUserOps.sendUpgradeToAndCallOp({ signer: spaceOwner.wallet })
    const upgradeOpReceipt = await upgradeOp.getUserOperationReceipt()
    expect(upgradeOpReceipt?.success).toBe(true)

    expect(originalClient.entrypointAddress).toBe(entryPoint06Address)

    await expect(async () => {
        await createUngatedSpace({
            userOps: spaceOwnerUserOps,
            spaceDapp,
            signer: spaceOwner.wallet,
            rolePermissions: [Permission.Read, Permission.Write],
        })
    }).rejects.toThrow()
})

test('calling upgrade twice results in an error', async () => {
    const { spaceOwner, spaceOwnerUserOps } = await setupPrexistingUsersAndASpace()

    const upgradeOp = await spaceOwnerUserOps.sendUpgradeToAndCallOp({ signer: spaceOwner.wallet })
    const upgradeOpReceipt = await upgradeOp.getUserOperationReceipt()
    expect(upgradeOpReceipt?.success).toBe(true)

    await expect(async () => {
        await spaceOwnerUserOps.sendUpgradeToAndCallOp({ signer: spaceOwner.wallet })
    }).rejects.toThrow()
})

async function setupPrexistingUsersAndASpace() {
    const { prov: bob, userOps: bobUserOps, spaceDapp } = await userWithDeployedSimpleAccount()
    const { prov: alice, userOps: aliceUserOps } = await userWithDeployedSimpleAccount()

    const newSpaceOp = await createUngatedSpace({
        userOps: bobUserOps,
        spaceDapp,
        signer: bob.wallet,
        rolePermissions: [Permission.Read, Permission.Write],
    })

    const useropReceipt = await newSpaceOp.getUserOperationReceipt()
    expect(useropReceipt?.success).toBe(true)
    const txReceipt = await waitForOpAndTx(newSpaceOp, bob)
    const spaceId = await getSpaceId(spaceDapp, txReceipt, bob.wallet.address, bobUserOps)

    const op = await aliceUserOps.sendJoinSpaceOp([spaceId, alice.wallet.address, alice.wallet])
    const useropReceipt2 = await op.getUserOperationReceipt()
    expect(useropReceipt2?.success).toBe(true)

    const aliceMembership = await spaceDapp.hasSpaceMembership(spaceId, alice.wallet.address)
    expect(aliceMembership).toBe(true)

    return {
        spaceMember: alice,
        spaceMemberUserOps: aliceUserOps,
        spaceMemberSmartAccount: await aliceUserOps.getSmartAccountClient({ signer: alice.wallet }),
        spaceOwner: bob,
        spaceOwnerUserOps: bobUserOps,
        spaceOwnerSmartAccount: await bobUserOps.getSmartAccountClient({ signer: bob.wallet }),
        spaceDapp,
        spaceId,
    }
}
