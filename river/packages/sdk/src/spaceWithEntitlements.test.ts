/**
 * @group with-entitlements
 */

import {
    createTownWithRequirements,
    createUserStreamAndSyncClient,
    everyoneMembershipStruct,
    expectUserCannotJoinSpace,
    expectUserCanJoin,
    linkWallets,
    getNftRuleData,
    getXchainConfigForTesting,
    erc20CheckOp,
    ethBalanceCheckOp,
    oneEth,
    oneHalfEth,
    setupWalletsAndContexts,
    threeEth,
    twoEth,
    twoNftRuleData,
    waitFor,
    createRole,
    createSpaceAndDefaultChannel,
} from './util.test'
import { dlog } from '@river-build/dlog'
import { MembershipOp } from '@river-build/proto'
import {
    Address,
    CheckOperationType,
    LogicalOperationType,
    NoopRuleData,
    Operation,
    OperationType,
    TestERC20,
    TestERC721,
    TestEthBalance,
    treeToRuleData,
    encodeThresholdParams,
    createExternalNFTStruct,
    Permission,
} from '@river-build/web3'

const log = dlog('csb:test:spaceWithEntitlements')

describe('spaceWithEntitlements', () => {
    let testNft1Address: string, testNft2Address: string, testNft3Address: string
    beforeAll(async () => {
        ;[testNft1Address, testNft2Address, testNft3Address] = await Promise.all([
            TestERC721.getContractAddress('TestNFT1'),
            TestERC721.getContractAddress('TestNFT2'),
            TestERC721.getContractAddress('TestNFT3'),
        ])
    })

    test('banned user not entitled to join space', async () => {
        const {
            alice,
            alicesWallet,
            aliceSpaceDapp,
            bob,
            bobSpaceDapp,
            bobProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        })

        // Have alice join the space so we can ban her
        await expectUserCanJoin(
            spaceId,
            channelId,
            'alice',
            alice,
            aliceSpaceDapp,
            alicesWallet.address,
            bobProvider.wallet,
        )

        const tx = await bobSpaceDapp.banWalletAddress(
            spaceId,
            alicesWallet.address,
            bobProvider.wallet,
        )
        await tx.wait()

        // Wait 2 seconds for the banning cache to expire on the stream node
        await new Promise((f) => setTimeout(f, 2000))

        // Alice no longer satisfies space entitlements
        const entitledWallet = await aliceSpaceDapp.getEntitledWalletForJoiningSpace(
            spaceId,
            alicesWallet.address,
            getXchainConfigForTesting(),
        )
        expect(entitledWallet).toBeUndefined()

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
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

    test('user with banning permission can ban other users', async () => {
        log('start user with banning permission can ban other users')
        const {
            bob,
            bobProvider,
            bobSpaceDapp,
            alice,
            aliceSpaceDapp,
            aliceProvider,
            alicesWallet,
            carol,
            carolsWallet,
            carolProvider,
            carolSpaceDapp,
        } = await setupWalletsAndContexts()

        const everyoneMembership = await everyoneMembershipStruct(bobSpaceDapp, bob)

        const { spaceId, defaultChannelId: channelId } = await createSpaceAndDefaultChannel(
            bob,
            bobSpaceDapp,
            bobProvider.wallet,
            "bob's town",
            everyoneMembership,
        )

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
        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )

        // Alice cannot kick Carol yet
        log('Alice cannot kick Carol')
        await expect(alice.removeUser(spaceId, carol.userId)).rejects.toThrow(/7:PERMISSION_DENIED/)

        let carolUserStreamView = carol.stream(carol.userStreamId!)!.view
        // Carol is still a member
        await waitFor(() => {
            expect(
                carolUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN),
            ).toBeTrue()
            expect(
                carolUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN),
            ).toBeTrue()
        })

        // Create an admin role for Alice that has permission to modify banning
        const { error: roleError } = await createRole(
            bobSpaceDapp,
            bobProvider,
            spaceId,
            'admin role',
            [Permission.ModifyBanning],
            [alice.userId],
            NoopRuleData,
            bobProvider.wallet,
        )
        expect(roleError).toBeUndefined()
        // Wait 2 seconds for the banning cache to expire on the stream node
        await new Promise((f) => setTimeout(f, 2000))

        log('Alice kicks Carol')
        await expect(alice.removeUser(spaceId, carol.userId)).toResolve()

        log('Carol is no longer a member of the space or channel')
        carolUserStreamView = carol.stream(carol.userStreamId!)!.view
        await waitFor(() => {
            expect(
                carolUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN),
            ).toBeFalse()
            expect(
                carolUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN),
            ).toBeFalse()
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
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
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

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
            ruleData: getNftRuleData(testNft1Address as Address),
        })

        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is linked to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

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
            ruleData: getNftRuleData(testNft1Address as Address),
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC721.publicMint('TestNFT1', carolsWallet.address as Address)

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
                ruleData: getNftRuleData(testNft1Address as Address),
            })

        // join alice
        log('Minting an NFT for alice')
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

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
                ruleData: getNftRuleData(testNft1Address as Address),
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
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

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

        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const aliceMintTx2 = TestERC721.publicMint('TestNFT2', alicesWallet.address as Address)

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

        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const carolMintTx2 = TestERC721.publicMint('TestNFT2', carolsWallet.address as Address)

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
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

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
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

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
        await TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)

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
        const params = encodeThresholdParams({ threshold: 1n })
        const leftOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft1Address as Address,
            params,
        }

        const rightOperation: Operation = {
            opType: OperationType.CHECK,
            checkType: CheckOperationType.ERC721,
            chainId: 31337n,
            contractAddress: testNft2Address as Address,
            params,
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
                contractAddress: testNft3Address as Address,
                params,
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
        const aliceMintTx1 = TestERC721.publicMint('TestNFT1', alicesWallet.address as Address)
        const aliceMintTx2 = TestERC721.publicMint('TestNFT2', alicesWallet.address as Address)
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

    test('user with only one entitlement from 3-nested NFT rule data can join space', async () => {
        const testNft1 = 'TestNft1'
        const testNft2 = 'TestNft2'
        const testNft3 = 'TestNft3'
        const testNftAddress = await TestERC721.getContractAddress(testNft1)
        const testNftAddress2 = await TestERC721.getContractAddress(testNft2)
        const testNftAddress3 = await TestERC721.getContractAddress(testNft3)

        const ruleData = createExternalNFTStruct([testNftAddress, testNftAddress2, testNftAddress3])

        const {
            alice,
            bob,
            carol,
            aliceSpaceDapp,
            aliceProvider,
            carolProvider,
            carolSpaceDapp,
            alicesWallet,
            carolsWallet,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })
        // Set up additional users to test single ownership of all three nfts.
        const {
            alice: dave,
            alicesWallet: davesWallet,
            aliceSpaceDapp: daveSpaceDapp,
            aliceProvider: daveProvider,
            carol: emily,
            carolProvider: emilyProvider,
            carolSpaceDapp: emilySpaceDapp,
            carolsWallet: emilyWallet,
        } = await setupWalletsAndContexts()

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from herclient, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        await TestERC721.publicMint(testNft1, carolsWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'carol',
            carol,
            carolSpaceDapp,
            carolsWallet.address,
            carolProvider.wallet,
        )

        await TestERC721.publicMint(testNft2, davesWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'dave',
            dave,
            daveSpaceDapp,
            davesWallet.address,
            daveProvider.wallet,
        )

        await TestERC721.publicMint(testNft3, emilyWallet.address as Address)
        await expectUserCanJoin(
            spaceId,
            channelId,
            'emily',
            emily,
            emilySpaceDapp,
            emilyWallet.address,
            emilyProvider.wallet,
        )

        // kill the clients
        const doneStart = Date.now()
        await bob.stopSync()
        await alice.stopSync()
        await carol.stopSync()
        await dave.stopSync()
        await emily.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20GateJoinPass', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // join alice
        log('Minting 100 ERC20 tokens for alice')
        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 100)

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

    test('erc20GateJoinFail', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from the client, which should fail.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('erc20GateJoinPass - join as root, asset in linked wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
            ruleData: ruleData,
        })

        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // join alice
        log('Minting 50 ERC20 tokens for carols wallet, which is linked to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

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

    test('erc20GateJoinPass - join as linked wallet, asset in root wallet', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
            ruleData: ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 50)

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

    test('erc20GateJoinPass - assets across wallets', async () => {
        const ruleData = treeToRuleData(await erc20CheckOp('TestERC20', 50n))
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
            ruleData: ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carols root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        // join alice
        log('Minting an NFT for carols wallet, which is the root to alices wallet')
        await TestERC20.publicMint('TestERC20', carolsWallet.address as Address, 25)
        await TestERC20.publicMint('TestERC20', alicesWallet.address as Address, 25)

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

    test('ethBalanceGateJoinPass', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, twoEth)

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

    test('ethBalanceGateJoinPass - across networks', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId, channelId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        await Promise.all([
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneEth + oneHalfEth),
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneEth),
        ])

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

    test('ethBalanceGateJoinFail', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(oneEth))

        const { alice, bob, aliceSpaceDapp, aliceProvider, alicesWallet, spaceId } =
            await createTownWithRequirements({
                everyone: false,
                users: [],
                ruleData,
            })

        // Explicitly set alice's balance to not enough, but not zero, since she has to pay to join
        // the town.
        await TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth)

        // Have alice create her own space so she can initialize her user stream.
        // Then she will attempt to join the space from the client, which should fail
        // for permissions reasons.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )

        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('eth balance gate join pass - join as root, linked wallet entitled', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(threeEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Setting Carol's cumulative balance to 3ETH
        await Promise.all([
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, twoEth),
        ])

        // Validate alice can join the space
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

    test('eth balance gated join pass - join as linked wallet, assets in root wallet', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Setting carol cumulative balance to 2ETH')
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneEth),
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        log('expect that alice can join the space')
        // Validate alice can join the space
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

    test('eth balance gated join pass - assets must accumulate across wallets', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(twoEth))
        const {
            alice,
            bob,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            alicesWallet,
            carolsWallet,
            carolProvider,
            spaceId,
            channelId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })

        log("Joining alice's wallet as a linked wallet to carol's root wallet")
        await linkWallets(carolSpaceDapp, carolProvider.wallet, aliceProvider.wallet)

        log('Setting carol cumulative balance to 2ETH')
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setRiverBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
            // Overprovision alice's wallet to pay for membership, gas fees for joining town
            TestEthBalance.setRiverBalance(alicesWallet.address as Address, oneEth),
        ])

        log('expect that alice can join the space')
        // Validate alice can join the space
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

    test('eth balance gate join fail - insufficient assets across wallets', async () => {
        const ruleData = treeToRuleData(ethBalanceCheckOp(threeEth))
        const {
            alice,
            bob,
            carol,
            aliceSpaceDapp,
            carolSpaceDapp,
            aliceProvider,
            carolsWallet,
            alicesWallet,
            carolProvider,
            spaceId,
        } = await createTownWithRequirements({
            everyone: false,
            users: [],
            ruleData,
        })
        // Link carol's wallet to alice's as root
        await linkWallets(aliceSpaceDapp, aliceProvider.wallet, carolProvider.wallet)

        // Set wallet balances to sum to < 3ETH but also be nonzero, as they have to pay to join the town.
        await Promise.all([
            TestEthBalance.setBaseBalance(carolsWallet.address as Address, oneHalfEth),
            TestEthBalance.setBaseBalance(alicesWallet.address as Address, oneHalfEth),
        ])

        // Have alice and carol create their own space so they can initialize their user streams.
        // Then they will attempt to join the space from the client, which should fail
        // for permissions reasons.
        await createUserStreamAndSyncClient(
            alice,
            aliceSpaceDapp,
            'alice',
            await everyoneMembershipStruct(aliceSpaceDapp, alice),
            aliceProvider.wallet,
        )
        await createUserStreamAndSyncClient(
            carol,
            carolSpaceDapp,
            'carol',
            await everyoneMembershipStruct(carolSpaceDapp, carol),
            carolProvider.wallet,
        )

        log('expect neither alice nor carol can join the space')
        await expectUserCannotJoinSpace(spaceId, alice, aliceSpaceDapp, alicesWallet.address)
        await expectUserCannotJoinSpace(spaceId, carol, carolSpaceDapp, carolsWallet.address)

        const doneStart = Date.now()
        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
