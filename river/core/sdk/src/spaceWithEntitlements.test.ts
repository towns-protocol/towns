/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/**
 * @group with-entitilements
 */

import {
    getDynamicPricingModule,
    makeDonePromise,
    makeTestClient,
    makeUserContextFromWallet,
    waitFor,
} from './util.test'
import { dlog } from '@river-build/dlog'
import { makeDefaultChannelStreamId, makeSpaceStreamId, makeUserStreamId } from './id'
import { MembershipOp } from '@river-build/proto'
import { ethers } from 'ethers'
import {
    CheckOperationType,
    ETH_ADDRESS,
    LocalhostWeb3Provider,
    LogicalOperationType,
    MembershipStruct,
    NoopRuleData,
    Operation,
    OperationType,
    Permission,
    createSpaceDapp,
    getContractAddress,
    publicMint,
    treeToRuleData,
} from '@river-build/web3'
import { makeBaseChainConfig } from './riverConfig'

const log = dlog('csb:test:spaceWithEntitlements')

async function setupWalletsAndContexts() {
    const baseConfig = makeBaseChainConfig()

    const [alicesWallet, bobsWallet] = await Promise.all([
        ethers.Wallet.createRandom(),
        ethers.Wallet.createRandom(),
    ])

    const [alicesContext, bobsContext] = await Promise.all([
        makeUserContextFromWallet(alicesWallet),
        makeUserContextFromWallet(bobsWallet),
    ])

    const aliceProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, alicesWallet)
    const bobProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobsWallet)

    await Promise.all([aliceProvider.fundWallet(), bobProvider.fundWallet()])

    const bobSpaceDapp = createSpaceDapp(bobProvider, baseConfig.chainConfig)
    const aliceSpaceDapp = createSpaceDapp(aliceProvider, baseConfig.chainConfig)

    // create a user
    const [alice, bob] = await Promise.all([
        makeTestClient({
            context: alicesContext,
        }),
        makeTestClient({ context: bobsContext }),
    ])

    return {
        alice,
        bob,
        alicesWallet,
        bobsWallet,
        alicesContext,
        bobsContext,
        aliceProvider,
        bobProvider,
        aliceSpaceDapp,
        bobSpaceDapp,
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
        // set up the web3 provider and spacedap
        const baseConfig = makeBaseChainConfig()

        const bobsWallet = ethers.Wallet.createRandom()
        const bobsContext = await makeUserContextFromWallet(bobsWallet)
        const bobProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, bobsWallet)
        await bobProvider.fundWallet()
        const bobSpaceDapp = createSpaceDapp(bobProvider, baseConfig.chainConfig)

        // create a user stream
        const bob = await makeTestClient({ context: bobsContext })
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
            },
        }
        log('transaction start bob creating space')
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )

        const receipt = await transaction.wait()
        log('transaction receipt', receipt)
        expect(receipt.status).toEqual(1)
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)
        // then on the river node
        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        // create the channel
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        log('Bob created channel')

        // join alice
        const alicesWallet = ethers.Wallet.createRandom()
        const alicesContext = await makeUserContextFromWallet(alicesWallet)
        const alice = await makeTestClient({
            context: alicesContext,
        })
        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        const aliceProvider = new LocalhostWeb3Provider(baseConfig.rpcUrl, alicesWallet)
        await aliceProvider.fundWallet()

        const aliceSpaceDapp = createSpaceDapp(aliceProvider, baseConfig.chainConfig)

        // await expect(alice.joinStream(spaceId)).rejects.toThrow() // todo

        // first join the space on chain
        log('transaction start Alice joining space')
        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)

        await alice.initializeUser({ spaceId })
        alice.startSync()

        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Alice cannot kick Bob
        await expect(alice.removeUser(spaceId, bob.userId)).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )

        // Bob is still a a member — Alice can't kick him because he's the owner
        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // Bob kicks Alice!
        await expect(bob.removeUser(spaceId, alice.userId)).toResolve()

        // Alice is no longer a member of the space or channel
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                false,
            )
        })

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done')
    })

    test('oneNftGateJoinPass', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const aliceMintTx = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData: {
                    operations: [{ opType: OperationType.CHECK, index: 0 }],
                    checkOperations: [
                        {
                            opType: CheckOperationType.ERC721,
                            chainId: 31337n,
                            contractAddress: testNft1Address,
                            threshold: 1n,
                        },
                    ],
                    logicalOperations: [],
                },
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        await aliceMintTx

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')

        const { issued, tokenId } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)
        log('Alice joined space and has a MembershipNFT', tokenId, Date.now() - aliceJoinStart)

        await alice.initializeUser({ spaceId })
        alice.startSync()

        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        log('Alice join took', Date.now() - aliceJoinStart)

        const doneStart = Date.now()

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('oneNftGateJoinFail', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData: {
                    operations: [{ opType: OperationType.CHECK, index: 0 }],
                    checkOperations: [
                        {
                            opType: CheckOperationType.ERC721,
                            chainId: 31337n,
                            contractAddress: testNft1Address,
                            threshold: 1n,
                        },
                    ],
                    logicalOperations: [],
                },
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()

        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')

        const { issued } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(false)
        log(
            'Alice correctly failed to join space and has a MembershipNFT',
            Date.now() - aliceJoinStart,
        )

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('twoNftGateJoinPass', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

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
        const root: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.AND,
            leftOperation,
            rightOperation,
        }

        const ruleData = treeToRuleData(root)

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData,
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        await Promise.all([aliceMintTx1, aliceMintTx2])

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')

        const { issued, tokenId } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)
        log('Alice joined space and has a MembershipNFT', tokenId, Date.now() - aliceJoinStart)

        await alice.initializeUser({ spaceId })
        alice.startSync()
        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        log('Alice join took', Date.now() - aliceJoinStart)

        const doneStart = Date.now()

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('twoNftGateJoinFail', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

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
        const root: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.AND,
            leftOperation,
            rightOperation,
        }

        const ruleData = treeToRuleData(root)

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData,
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        await Promise.all([aliceMintTx1])

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

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
    })

    test('OrOfTwoNftGateJoinPass', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

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
        const root: Operation = {
            opType: OperationType.LOGICAL,
            logicalType: LogicalOperationType.OR,
            leftOperation,
            rightOperation,
        }

        const ruleData = treeToRuleData(root)

        // create a space stream,
        log('Bob created user, about to create space')
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData,
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        await Promise.all([aliceMintTx1])

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')

        const { issued, tokenId } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)
        log('Alice joined space and has a MembershipNFT', tokenId, Date.now() - aliceJoinStart)

        await alice.initializeUser({ spaceId })
        alice.startSync()
        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        log('Alice join took', Date.now() - aliceJoinStart)

        const doneStart = Date.now()

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })

    test('orOfTwoNftOrOneNftGateJoinPass', async () => {
        const createAliceAndBobStart = Date.now()

        const {
            alice,
            bob,
            alicesWallet,
            aliceProvider,
            bobProvider,
            aliceSpaceDapp,
            bobSpaceDapp,
        } = await setupWalletsAndContexts()

        const aliceMintTx1 = publicMint('TestNFT1', alicesWallet.address as `0x${string}`)
        const aliceMintTx2 = publicMint('TestNFT2', alicesWallet.address as `0x${string}`)

        log('createAliceAndBobStart took', Date.now() - createAliceAndBobStart)

        const listPricingModulesStart = Date.now()
        const pricingModules = await bobSpaceDapp.listPricingModules()
        const dynamicPricingModule = getDynamicPricingModule(pricingModules)
        expect(dynamicPricingModule).toBeDefined()

        log('listPricingModules took', Date.now() - listPricingModulesStart)

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

        // create a space stream,
        log('Bob created user, about to create space', ruleData, ruleData)
        // first on the blockchain
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
            requirements: {
                everyone: false,
                users: [],
                ruleData,
            },
        }
        log('transaction start bob creating space')
        const createSpaceStart = Date.now()
        const transaction = await bobSpaceDapp.createSpace(
            {
                spaceName: 'bobs-space-metadata',
                spaceMetadata: 'bobs-space-metadata',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            bobProvider.wallet,
        )
        log('transaction took', Date.now() - createSpaceStart)

        const createSpaceTxStart = Date.now()
        const receipt = await transaction.wait()
        log('createSpaceTxStart transaction receipt', Date.now() - createSpaceTxStart)

        expect(receipt.status).toEqual(1)
        const bobMakeStreamStart = Date.now()
        const spaceAddress = bobSpaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

        await bob.initializeUser({ spaceId })
        bob.startSync()
        const returnVal = await bob.createSpace(spaceId)
        expect(returnVal.streamId).toEqual(spaceId)
        // Now there must be "joined space" event in the user stream.
        const bobsUserStreamId = makeUserStreamId(bob.userId)

        const bobUserStreamView = bob.stream(bobsUserStreamId)!.view
        expect(bobUserStreamView).toBeDefined()
        expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)

        const waitForStreamPromise = makeDonePromise()
        bob.on('userJoinedStream', (streamId) => {
            if (streamId === channelId) {
                waitForStreamPromise.done()
            }
        })

        log('bobMakeStream took', Date.now() - bobMakeStreamStart)
        log('Bob created space, about to create channel')
        const channelProperties = 'Bobs channel properties'
        const channelReturnVal = await bob.createChannel(
            spaceId,
            'general',
            channelProperties,
            channelId,
        )
        expect(channelReturnVal.streamId).toEqual(channelId)

        await waitFor(() => {
            expect(bobUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(bobUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        // join alice
        const createAliceStart = Date.now()

        log('Creating alice spaceDapp took', Date.now() - createAliceStart)

        log('Alice created user, about to mint gating NFT')

        const makeAliceClientStart = Date.now()
        log('Creating alice client took', Date.now() - makeAliceClientStart)

        log('Alice created user, about to join space', { alicesUserId: alice.userId })

        await Promise.all([aliceMintTx1, aliceMintTx2])

        // first join the space on chain
        const aliceJoinStart = Date.now()
        log('transaction start Alice joining space')

        const { issued, tokenId } = await aliceSpaceDapp.joinSpace(
            spaceId,
            alicesWallet.address,
            aliceProvider.wallet,
        )
        expect(issued).toBe(true)
        log('Alice joined space and has a MembershipNFT', tokenId, Date.now() - aliceJoinStart)

        await alice.initializeUser({ spaceId })
        alice.startSync()
        await expect(alice.joinStream(spaceId)).toResolve()
        await expect(alice.joinStream(channelId)).toResolve()

        const aliceUserStreamView = alice.stream(alice.userStreamId!)!.view
        await waitFor(() => {
            expect(aliceUserStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
            expect(aliceUserStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(
                true,
            )
        })

        log('Alice join took', Date.now() - aliceJoinStart)

        const doneStart = Date.now()

        // kill the clients
        await bob.stopSync()
        await alice.stopSync()
        log('Done', Date.now() - doneStart)
    })
})
