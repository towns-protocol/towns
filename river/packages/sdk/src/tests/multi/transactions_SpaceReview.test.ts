import { dlog } from '@river-build/dlog'
import { makeRiverConfig } from '../../riverConfig'
import { Bot } from '../../sync-agent/utils/bot'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { ethers } from 'ethers'
import { getSpaceReviewEventData } from '@river-build/web3'

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

    beforeAll(async () => {
        const log = base_log.extend('beforeAll')
        log('start')

        await Promise.all([bobIdentity.fundWallet(), aliceIdentity.fundWallet()])

        bob = await bobIdentity.makeSyncAgent()
        alice = await aliceIdentity.makeSyncAgent()

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

        await alice.spaces.joinSpace(spaceIdWithAlice, aliceIdentity.signer)

        // make another space
        const { spaceId: sid2 } = await bob.spaces.createSpace(
            { spaceName: 'Lets REvieW 2' },
            bobIdentity.signer,
        )
        spaceIdWithoutAlice = sid2

        log('before all complete', { spaceIdWithAlice, spaceIdWithoutAlice })
        // todo, leave a review on the without alice space
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
    })
    test('alice sees review in user stream', async () => {})
    test('alice sees review in space stream', async () => {})
    test('bob sees review in space stream', async () => {})
    test('bob can emoji review', async () => {})
    test('alice can see emoji', async () => {})
    test('bob can tip review', async () => {})
    test('alice can see tip', async () => {})
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
    })
    test('cant add review with bad space', async () => {})
    test('cant add review with bad sender', async () => {})
    test('alice snapshot', async () => {})
    test('space snapshot', async () => {})
})
