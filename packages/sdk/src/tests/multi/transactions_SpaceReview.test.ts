import { dlog } from '@towns-protocol/dlog'
import { makeRiverConfig } from '../../riverConfig'
import { Bot } from '../../sync-agent/utils/bot'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { ContractReceipt, ethers } from 'ethers'
import {
    ETH_ADDRESS,
    getSpaceReviewEventData,
    getSpaceReviewEventDataBin,
    SpaceReviewAction,
    SpaceReviewEventObject,
} from '@towns-protocol/web3'
import { waitForValue } from '../testUtils'
import { BlockchainTransaction_SpaceReview_Action } from '@towns-protocol/proto'
import { UnauthenticatedClient } from '../../unauthenticatedClient'
import { RiverTimelineEvent, TimelineEvent } from '../../views/models/timelineTypes'

const base_log = dlog('csb:test:transaction_SpaceReview')

describe('transaction_SpaceReview', () => {
    const riverConfig = makeRiverConfig()
    const bobIdentity = new Bot(undefined, riverConfig)
    const aliceIdentity = new Bot(undefined, riverConfig)
    const alicesOtherWallet = ethers.Wallet.createRandom()
    let bob: SyncAgent
    let alice: SyncAgent
    let spaceIdWithAlice: string
    let spaceIdWithoutAlice: string
    let aliceTokenId: string
    const chainId = riverConfig.base.chainConfig.chainId
    let spaceReviewEventId: string | undefined
    let orphanReviewReceipt: ContractReceipt | undefined

    beforeAll(async () => {
        const log = base_log.extend('beforeAll')
        log('start')
        // fund wallets
        await Promise.all([bobIdentity.fundWallet(), aliceIdentity.fundWallet()])
        // make agents
        bob = await bobIdentity.makeSyncAgent()
        alice = await aliceIdentity.makeSyncAgent()
        // start agents
        await Promise.all([
            bob.start(),
            alice.start(),
            alice.riverConnection.spaceDapp.walletLink.linkWalletToRootKey(
                aliceIdentity.signer,
                alicesOtherWallet,
            ),
        ])
        // make a space
        const { spaceId: sid1 } = await bob.spaces.createSpace(
            { spaceName: 'Lets REvieW 1' },
            bobIdentity.signer,
        )
        spaceIdWithAlice = sid1
        // join the space
        await alice.spaces.joinSpace(spaceIdWithAlice, aliceIdentity.signer)
        // get alice's token id
        const aliceTokenId_ = await bob.riverConnection.spaceDapp.getTokenIdOfOwner(
            spaceIdWithAlice,
            aliceIdentity.rootWallet.address,
        )
        expect(aliceTokenId_).toBeDefined()
        aliceTokenId = aliceTokenId_!
        // make another space
        const { spaceId: sid2 } = await bob.spaces.createSpace(
            { spaceName: 'Lets REvieW 2' },
            bobIdentity.signer,
        )
        spaceIdWithoutAlice = sid2
        log('complete', { spaceIdWithAlice, spaceIdWithoutAlice })
        // todo, leave a review on the without alice space
    })

    afterAll(async () => {
        await bob.stop()
        await alice.stop()
    })

    test('alice adds review', async () => {
        const web3Space = alice.riverConnection.spaceDapp.getSpace(spaceIdWithAlice)
        expect(web3Space).toBeDefined()
        const tx = await web3Space!.Review.addReview(
            {
                rating: 5,
                comment: 'This is a test review',
            },
            aliceIdentity.signer,
        )
        expect(tx).toBeDefined()
        const receipt = await tx.wait(2)
        expect(receipt).toBeDefined()
        const reviewEvent = getSpaceReviewEventData(receipt.logs, aliceIdentity.userId)
        expect(reviewEvent).toBeDefined()
        expect(reviewEvent.rating).toBe(5)
        expect(reviewEvent.comment).toBe('This is a test review')
        await alice.riverConnection.client?.addTransaction_SpaceReview(
            chainId,
            receipt,
            reviewEvent,
            spaceIdWithAlice,
        )
    })
    test('alice sees review in user stream', async () => {
        const stream = alice.riverConnection.client!.stream(
            alice.riverConnection.client!.userStreamId!,
        )
        if (!stream) throw new Error('no stream found')
        const reviewEvent = await waitForValue(() => {
            const reviewEvents = stream.view.timeline.filter(isUserBlockchainTransaction)
            expect(reviewEvents.length).toBeGreaterThan(0)
            const reviewEvent = reviewEvents[0]
            expect(reviewEvent).toBeDefined()
            if (
                !reviewEvent ||
                reviewEvent.content?.kind !== RiverTimelineEvent.UserBlockchainTransaction
            )
                throw new Error('no review event whaaa?')
            return reviewEvent.content.transaction
        })
        if (reviewEvent?.content.case !== 'spaceReview') {
            throw new Error('no review event whaaa?')
        }
        expect(reviewEvent.receipt).toBeDefined()
        expect(reviewEvent.content.value.action).toBe(BlockchainTransaction_SpaceReview_Action.Add)
        if (!reviewEvent.content.value.event) {
            throw new Error('no event in space review')
        }
        const { comment, rating, action } = getSpaceReviewEventDataBin(
            reviewEvent.receipt!.logs,
            reviewEvent.content.value.event.user,
        )
        expect(action).toBe(SpaceReviewAction.Add)
        expect(comment).toBe('This is a test review')
        expect(rating).toBe(5)
    })
    test('alice sees review in space stream', async () => {
        const stream = alice.riverConnection.client!.stream(spaceIdWithAlice)
        if (!stream) throw new Error('no stream found')
        const reviewEvent = await waitForValue(() => {
            const reviewEvents = stream.view.membershipContent.spaceReviews
            expect(reviewEvents.length).toBe(1)
            const reviewEvent = reviewEvents[0]
            return reviewEvent
        })
        spaceReviewEventId = reviewEvent.eventHashStr
        const { comment, rating } = reviewEvent.review
        expect(comment).toBe('This is a test review')
        expect(rating).toBe(5)
    })
    test('bob sees review in space stream', async () => {
        const stream = bob.riverConnection.client!.stream(spaceIdWithAlice)
        if (!stream) throw new Error('no stream found')
        const reviewEvent = await waitForValue(() => {
            const reviewEvents = stream.view.membershipContent.spaceReviews
            expect(reviewEvents.length).toBe(1)
            return reviewEvents[0]
        })
        expect(reviewEvent).toBeDefined()
        expect(stream.view.membershipContent.spaceReviews.length).toBe(1)
    })
    test('bob can tip review', async () => {
        const tx = await bob.riverConnection.spaceDapp.tip(
            {
                spaceId: spaceIdWithAlice,
                tokenId: aliceTokenId,
                currency: ETH_ADDRESS,
                amount: 1000n,
                messageId: spaceReviewEventId!,
                channelId: spaceIdWithAlice,
                receiver: aliceIdentity.userId,
            },
            bobIdentity.signer,
        )
        const receipt = await tx.wait(2)
        expect(receipt).toBeDefined()
        const tipEvent = bob.riverConnection.spaceDapp.getTipEvent(
            spaceIdWithAlice,
            receipt,
            bobIdentity.rootWallet.address,
        )
        expect(tipEvent).toBeDefined()
        if (!tipEvent) throw new Error('no tip event found')
        await bob.riverConnection.client!.addTransaction_Tip(
            chainId,
            receipt,
            tipEvent,
            aliceIdentity.rootWallet.address,
        )
    })
    test('alice can see tip received in user stream', async () => {
        const stream = alice.riverConnection.client!.stream(
            alice.riverConnection.client!.userStreamId!,
        )
        if (!stream) throw new Error('no stream found')
        const tipEvent = await waitForValue(() => {
            const tipEvents = stream.view.timeline.filter(isUserReceivedBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            if (!tip || tip.content?.kind !== RiverTimelineEvent.UserReceivedBlockchainTransaction)
                throw new Error('no tip event found')
            return tip.content.receivedTransaction
        })
        if (!tipEvent) throw new Error('no tip event found')
        expect(tipEvent.transaction?.receipt).toBeDefined()
    })
    test('alice can see tip in space stream', async () => {
        const stream = alice.riverConnection.client!.stream(spaceIdWithAlice)
        if (!stream) throw new Error('no stream found')
        const tipEvent = await waitForValue(() => {
            const tipEvents = stream.view.timeline.filter(isTipBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            if (!tip || tip.content?.kind !== RiverTimelineEvent.TipEvent)
                throw new Error('no tip event found')
            return tip.content
        })
        if (!tipEvent) throw new Error('no tip event found')
        expect(tipEvent.transaction?.receipt).toBeDefined()
    })
    test('alice updates review', async () => {
        const web3Space = alice.riverConnection.spaceDapp.getSpace(spaceIdWithAlice)
        expect(web3Space).toBeDefined()
        const tx = await web3Space!.Review.updateReview(
            {
                rating: 4,
                comment: 'This is a worse test review',
            },
            aliceIdentity.signer,
        )
        expect(tx).toBeDefined()
        const receipt = await tx.wait(2)
        expect(receipt).toBeDefined()
        const reviewEvent = getSpaceReviewEventData(receipt.logs, aliceIdentity.userId)
        expect(reviewEvent).toBeDefined()
        expect(reviewEvent.rating).toBe(4)
        expect(reviewEvent.comment).toBe('This is a worse test review')
        await expect(
            alice.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                receipt,
                reviewEvent,
                spaceIdWithAlice,
            ),
        ).resolves.not.toThrow()
    })
    test('alice deletes review', async () => {
        const web3Space = alice.riverConnection.spaceDapp.getSpace(spaceIdWithAlice)
        expect(web3Space).toBeDefined()
        const tx = await web3Space!.Review.deleteReview(aliceIdentity.signer)
        expect(tx).toBeDefined()
        const receipt = await tx.wait(2)
        expect(receipt).toBeDefined()
        const reviewEvent = getSpaceReviewEventData(receipt.logs, aliceIdentity.userId)
        expect(reviewEvent).toBeDefined()
        expect(reviewEvent.rating).toBe(0)
        expect(reviewEvent.comment).toBeUndefined()
        await expect(
            alice.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                receipt,
                reviewEvent,
                spaceIdWithAlice,
            ),
        ).resolves.not.toThrow()
    })
    test('bob leaves an orphan review', async () => {
        const tx = await bob.riverConnection.spaceDapp
            .getSpace(spaceIdWithoutAlice)
            ?.Review.addReview(
                {
                    rating: 5,
                    comment: 'This is an orphan review',
                },
                bobIdentity.signer,
            )
        expect(tx).toBeDefined()
        const receipt = await tx!.wait(2)

        orphanReviewReceipt = receipt!
    })
    test('cant add review with bad space', async () => {
        // bob leaves a review on spaceIdWithoutAlice
        const reviewEvent = {
            action: SpaceReviewAction.Add,
            user: bobIdentity.userId,
            rating: 5,
        } satisfies SpaceReviewEventObject

        await expect(
            bob.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                orphanReviewReceipt!,
                reviewEvent,
                spaceIdWithAlice, // wrong space!
            ),
        ).rejects.toThrow('matching review event not found in receipt logs')
    })
    test('cant add review with bad sender', async () => {
        const reviewEvent = {
            action: SpaceReviewAction.Add,
            user: bobIdentity.userId,
            rating: 5,
        } satisfies SpaceReviewEventObject

        await expect(
            // alice didn't send this!
            alice.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                orphanReviewReceipt!,
                reviewEvent,
                spaceIdWithoutAlice,
            ),
        ).rejects.toThrow('IsEntitled failed')
    })
    test('cant add review with bad rating', async () => {
        const reviewEvent = {
            action: SpaceReviewAction.Add,
            user: bobIdentity.userId,
            rating: 1, // wrong rating!
        } satisfies SpaceReviewEventObject

        await expect(
            bob.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                orphanReviewReceipt!,
                reviewEvent,
                spaceIdWithoutAlice,
            ),
        ).rejects.toThrow('matching review event not found in receipt logs')
    })
    test('cant add review with bad action', async () => {
        const reviewEvent = {
            action: SpaceReviewAction.Update, // wrong action!
            user: bobIdentity.userId,
            rating: 5,
        } satisfies SpaceReviewEventObject

        await expect(
            bob.riverConnection.client!.addTransaction_SpaceReview(
                chainId,
                orphanReviewReceipt!,
                reviewEvent,
                spaceIdWithoutAlice,
            ),
        ).rejects.toThrow('matching review event not found in receipt logs')
    })
    test('alice snapshot', async () => {
        await alice.riverConnection.client!.debugForceMakeMiniblock(
            alice.riverConnection.client!.userStreamId!,
            { forceSnapshot: true },
        )
        const streamView = await alice.riverConnection.client!.getStream(
            alice.riverConnection.client!.userStreamId!,
        )
        expect(streamView).toBeDefined()
    })
    test('space snapshot', async () => {
        await bob.riverConnection.client!.debugForceMakeMiniblock(spaceIdWithAlice, {
            forceSnapshot: true,
        })
        const streamView = await bob.riverConnection.client!.getStream(spaceIdWithAlice)
        expect(streamView).toBeDefined()
        // after the snapshot, we no longer see the review
        expect(streamView.membershipContent.spaceReviews.length).toBe(0)
        // do some scrollback
        const unauthenticatedClient = new UnauthenticatedClient(
            alice.riverConnection.client!.rpcClient,
        )
        await unauthenticatedClient.scrollback(streamView)
        expect(streamView.membershipContent.spaceReviews.length).toBe(1)
    })
})

const isTipBlockchainTransaction = (e: TimelineEvent) =>
    e.content?.kind === RiverTimelineEvent.TipEvent

const isUserBlockchainTransaction = (e: TimelineEvent) =>
    e.content?.kind === RiverTimelineEvent.UserBlockchainTransaction

const isUserReceivedBlockchainTransaction = (e: TimelineEvent) =>
    e.content?.kind === RiverTimelineEvent.UserReceivedBlockchainTransaction
