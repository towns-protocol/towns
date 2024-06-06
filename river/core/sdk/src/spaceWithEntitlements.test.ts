/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import {
    getDynamicPricingModule,
    everyoneMembershipStruct,
    waitFor,
    createUserStreamAndSyncClient,
    createSpaceAndDefaultChannel,
    expectUserCanJoin,
    setupWalletsAndContexts,
    linkWallets,
    getNftRuleData,
    twoNftRuleData,
} from './util.test'
import { dlog } from '@river-build/dlog'
import { MembershipOp } from '@river-build/proto'
import {
    CheckOperationType,
    ETH_ADDRESS,
    LogicalOperationType,
    MembershipStruct,
    NoopRuleData,
    Operation,
    OperationType,
    Permission,
    getContractAddress,
    publicMint,
    treeToRuleData,
    IRuleEntitlement,
} from '@river-build/web3'

const log = dlog('csb:test:spaceWithEntitlements')

// Users need to be mapped from 'alice', 'bob', etc to their wallet addresses,
// because the wallets are created within this helper method.
async function createTownWithRequirements(requirements: {
    everyone: boolean
    users: string[]
    ruleData: IRuleEntitlement.RuleDataStruct
}) {
    const {
        alice,
        bob,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        aliceProvider,
        bobProvider,
        carolProvider,
        alicesWallet,
        bobsWallet,
        carolsWallet,
    } = await setupWalletsAndContexts()

    const pricingModules = await bobSpaceDapp.listPricingModules()
    const dynamicPricingModule = getDynamicPricingModule(pricingModules)
    expect(dynamicPricingModule).toBeDefined()

    const userNameToWallet: Record<string, string> = {
        alice: alicesWallet.address,
        bob: bobsWallet.address,
        carol: carolsWallet.address,
    }
    requirements.users = requirements.users.map((user) => userNameToWallet[user])

    const membershipInfo: MembershipStruct = {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 1000,
            duration: 0,
            currency: ETH_ADDRESS,
            feeRecipient: bob.userId,
            freeAllocation: 0,
            pricingModule: dynamicPricingModule!.module,
        },
        permissions: [Permission.Read, Permission.Write],
        requirements,
    }

    // This helper method validates that the owner can join the space and default channel.
    const {
        spaceId,
        defaultChannelId: channelId,
        userStreamView: bobUserStreamView,
    } = await createSpaceAndDefaultChannel(
        bob,
        bobSpaceDapp,
        bobProvider.wallet,
        'bobs',
        membershipInfo,
    )

    return {
        alice,
        bob,
        aliceSpaceDapp,
        bobSpaceDapp,
        carolSpaceDapp,
        aliceProvider,
        bobProvider,
        carolProvider,
        alicesWallet,
        bobsWallet,
        carolsWallet,
        spaceId,
        channelId,
        bobUserStreamView,
    }
}

describe('spaceWithEntitlements', () => {
    let testNft1Address: string, testNft2Address: string, testNft3Address: string
    beforeAll(async () => {
        ;[testNft1Address, testNft2Address, testNft3Address] = await Promise.all([
            getContractAddress('TestNFT1'),
            getContractAddress('TestNFT2'),
            getContractAddress('TestNFT3'),
        ])
    })

    // Banning with entitlements — users need permission to ban other users.
    test('ownerCanBanOtherUsers', async () => {
        log('start ownerCanBanOtherUsers')
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            spaceId,
            channelId,
            bobUserStreamView,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        })

        // await expect(alice.joinStream(spaceId)).rejects.toThrow() // todo

        log('Alice should be able to join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Alice cannot kick Bob
        log('Alice cannot kick bob')
        await expect(alice.removeUser(spaceId, bob.userId)).rejects.toThrow(/7:PERMISSION_DENIED/)

        // Bob is still a a member — Alice can't kick him because he's the owner
        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBeTrue()
            expect(
                bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN),
            ).toBeTrue()
        })

        // Bob kicks Alice!
        log('Bob kicks Alice')
        await expect(bob.removeUser(spaceId, alice.userId)).toResolve()

        // Alice is no longer a member of the space or channel
        log('Alice is no longer a member of the space or channel')
        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(
                aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN),
            ).toBeFalse()
            expect(
                aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN),
            ).toBeFalse()
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })

    test('userEntitlementPass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: ['alice'],
                ruleData: NoopRuleData,
            })

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('userEntitlementFail', async () => {
        const { alice, bob, aliceSpaceDapp, alicesWallet, aliceProvider, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: ['carol'], // not alice!
                ruleData: NoopRuleData,
            })

        // Alice cannot join the space in the contract.
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)

        // Have alice create a user stream attached to her own space.
        // Then she will attempt to join the space from the client, which should also fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        // Alice cannot join the space on the stream node.
        await expect(alice.joinStream(spaceId)).rejects.toThrow(/PERMISSION_DENIED/)

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // This test is commented out as the membership joinSpace does not check linked wallets
    // against the user entitlement.
    test('userEntitlementPass - join as root, linked wallet whitelisted', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            alicesWallet,
            aliceProvider,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: ['carol'], // not alice!
            ruleData: NoopRuleData,
        })
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Alice should be able to join the space on the stream node.
        log('Alice should be able to join space', spaceId)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    // This test is commented out as the membership joinSpace does not check linked wallets
    // against the user entitlement.
    test('userEntitlementPass - join as linked wallet, root wallet whitelisted', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: ['carol'], // not alice!
            ruleData: NoopRuleData,
        })

        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // Alice should be able to join the space on the stream node.
        log('Alice should be able to join space', spaceId)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // Kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as root, asset in linked wallet', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: getNftRuleData(testNft1Address as `0x${string}`),
        })

        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await publicMint('TestNFT1', carolsWallet.address as `0x${string}`)

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: getNftRuleData(testNft1Address as `0x${string}`),
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await publicMint('TestNFT1', carolsWallet.address as `0x${string}`)

        log('expect that alice can join the space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinPass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: getNftRuleData(testNft1Address as `0x${string}`),
            })

        // join alice
        log('Minting an NFT for alice')
        await publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinFail', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: getNftRuleData(testNft1Address as `0x${string}`),
            })

        log('Alice about to attempt to join space', { alicesUserId: alice.userId })
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)

        // Have alice create a user stream attached to her own space.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        // Alice cannot join the space on the stream node.
        await expect(alice.joinStream(spaceId)).rejects.toThrow(/PERMISSION_DENIED/)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('twoNftGateJoinPass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: twoNftRuleData(testNft1Address, testNft2Address),
            })

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)

        log('Minting nfts for alice')
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('Alice should be able to join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinPass - acrossLinkedWallets', async () => {
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolProvider,
            alicesWallet,
            carolsWallet,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData: twoNftRuleData(testNft1Address, testNft2Address),
        })

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const carolMintTx2 = publicMint('TestNFT2', carolsWallet.address as `0x${string}`)

        log('Minting nfts for alice and carol')
        await Promise.all([aliceMintTx1, carolMintTx2])

        log("linking carols wallet to alice's wallet")
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        log('Alice should be able to join space with one asset in carol wallet')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinFail', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: twoNftRuleData(testNft1Address, testNft2Address),
            })

        // join alice
        log('Minting an NFT for alice')
        await publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)
        log('Alice failed to join space and has a MembershipNFT', Date.now() - aliceJoinStart)

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )
        // Alice cannot join the space on the stream node.
        await expect(alice.joinStream(spaceId)).rejects.toThrow(/7:PERMISSION_DENIED/)

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('OrOfTwoNftGateJoinPass', async () => {
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData: twoNftRuleData(testNft1Address, testNft2Address, LogicalOperationType.OR),
            })

        // join alice
        log('Minting an NFT for alice')
        await publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        // first join the space on chain
        log('Expect alice can join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('orOfTwoNftOrOneNftGateJoinPass', async () => {
        const leftOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft1Address as `0x${string}`,
            threshold: 1n,
        }

        const rightOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft2Address as `0x${string}`,
            threshold: 1n,
        }
        const two: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.AND,
            leftOperation,
            rightOperation,
        }

        const root: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation: two,
            rightOperation: {
                opType: OperationType.CHECK,
                checkType: CheckOperationType.ERC721,
                chainId: 31337n,
                contractAddress: testNft3Address as `0x${string}`,
                threshold: 1n,
            },
        }

        const ruleData = treeToRuleData(root)
        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        log("Mint Alice's NFTs")
        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)
        await Promise.all([aliceMintTx1, aliceMintTx2])

        log('expect alice can join space')
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            aliceProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
