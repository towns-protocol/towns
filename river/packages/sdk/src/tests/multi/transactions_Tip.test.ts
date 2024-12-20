/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { ETH_ADDRESS, LocalhostWeb3Provider } from '@river-build/web3'
import { makeRiverConfig } from '../../riverConfig'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { Bot } from '../../sync-agent/utils/bot'
import { waitFor } from '../testUtils'
import { StreamTimelineEvent } from '../../types'
import { ReceivedBlockchainTransactionKind } from '@river-build/proto'
import { userIdFromAddress } from '../../id'

const base_log = dlog('csb:test:transactions_Tip')

describe('transactions_Tip', () => {
    const riverConfig = makeRiverConfig()
    const bobIdentity = new Bot(undefined, riverConfig)
    const aliceIdentity = new Bot(undefined, riverConfig)
    const bobsOtherWallet = ethers.Wallet.createRandom()
    const bobsOtherWalletProvider = new LocalhostWeb3Provider(
        riverConfig.base.rpcUrl,
        bobsOtherWallet,
    )
    const chainId = riverConfig.base.chainConfig.chainId

    // updated once and shared between tests
    let bob: SyncAgent
    let alice: SyncAgent
    let spaceId: string
    let defaultChannelId: string
    let messageId: string

    beforeAll(async () => {
        // setup once
        const log = base_log.extend('beforeAll')
        log('start')

        await Promise.all([
            bobIdentity.fundWallet(),
            aliceIdentity.fundWallet(),
            bobsOtherWalletProvider.fundWallet(),
        ])

        bob = await bobIdentity.makeSyncAgent()
        alice = await aliceIdentity.makeSyncAgent()

        await Promise.all([
            bob.start(),
            alice.start(),
            bob.riverConnection.spaceDapp.walletLink.linkWalletToRootKey(
                bobIdentity.signer,
                bobsOtherWallet,
            ),
        ])

        // before they can do anything on river, they need to be in a space
        const { spaceId: sid, defaultChannelId: cid } = await bob.spaces.createSpace(
            { spaceName: 'BlastOff_Tip' },
            bobIdentity.signer,
        )
        spaceId = sid
        defaultChannelId = cid

        await alice.spaces.joinSpace(spaceId, aliceIdentity.signer)
        const channel = alice.spaces.getSpace(spaceId).getChannel(defaultChannelId)
        const { eventId } = await channel.sendMessage('hello bob')
        messageId = eventId
        log('bob and alice joined space', spaceId, defaultChannelId, messageId)
    })

    test('addTip', async () => {
        // a user should be able to upload a transaction that
        // is a tip and is valid on chain
        const tokenId = await bob.riverConnection.spaceDapp.getTokenIdOfOwner(
            spaceId,
            aliceIdentity.rootWallet.address,
        )
        expect(tokenId).toBeDefined()
        const tx = await bob.riverConnection.spaceDapp.tip(
            {
                spaceId,
                tokenId: tokenId!,
                currency: ETH_ADDRESS,
                amount: 1000n,
                messageId: messageId,
                channelId: defaultChannelId,
            },
            bobIdentity.signer,
        )
        const receipt = await tx.wait(2)
        expect(receipt.from).toEqual(bobIdentity.rootWallet.address)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                receipt,
                defaultChannelId,
                messageId,
                aliceIdentity.rootWallet.address,
                1000n,
                ETH_ADDRESS,
            ),
        ).resolves.not.toThrow()
    })

    test('bobSeesTipInUserStream', async () => {
        const stream = await bob.riverConnection.client!.getStream(
            bob.riverConnection.client!.userStreamId!,
        )
        const tipEvent = await waitFor(() => {
            const isUserBlockchainTransaction = (e: StreamTimelineEvent) =>
                e.remoteEvent?.event.payload.case === 'userPayload' &&
                e.remoteEvent.event.payload.value.content.case === 'blockchainTransaction'
            const tipEvents = stream.timeline.filter(isUserBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (
                !tip ||
                tip.remoteEvent?.event.payload.value?.content.case !== 'blockchainTransaction'
            )
                throw new Error('no tip event found')
            return tip.remoteEvent.event.payload.value.content.value
        })
        expect(tipEvent?.receipt).toBeDefined()
    })

    test('aliceSeesTipReceivedInUserStream', async () => {
        const stream = await alice.riverConnection.client!.getStream(
            alice.riverConnection.client!.userStreamId!,
        )
        const tipEvent = await waitFor(() => {
            const isUserReceivedBlockchainTransaction = (e: StreamTimelineEvent) =>
                e.remoteEvent?.event.payload.case === 'userPayload' &&
                e.remoteEvent.event.payload.value.content.case === 'receivedBlockchainTransaction'
            const tipEvents = stream.timeline.filter(isUserReceivedBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (
                !tip ||
                tip.remoteEvent?.event.payload.value?.content.case !==
                    'receivedBlockchainTransaction'
            )
                throw new Error('no tip event found')
            return tip.remoteEvent.event.payload.value.content.value
        })
        if (!tipEvent) throw new Error('no tip event found')
        expect(tipEvent.transaction?.receipt).toBeDefined()
        expect(tipEvent?.kind).toEqual(ReceivedBlockchainTransactionKind.TIP)
    })

    test('bobSeesOnMessageInChannel', async () => {
        const stream = await bob.riverConnection.client!.getStream(defaultChannelId)
        const tipEvent = await waitFor(() => {
            const isMemberBlockchainTransaction = (e: StreamTimelineEvent) =>
                e.remoteEvent?.event.payload.case === 'memberPayload' &&
                e.remoteEvent.event.payload.value.content.case === 'memberBlockchainTransaction'
            const tipEvents = stream.timeline.filter(isMemberBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (
                !tip ||
                tip.remoteEvent?.event.payload.value?.content.case !== 'memberBlockchainTransaction'
            )
                throw new Error('no tip event found')
            return tip.remoteEvent.event.payload.value.content.value
        })
        expect(tipEvent?.transaction?.receipt).toBeDefined()
        expect(userIdFromAddress(tipEvent!.fromUserAddress)).toEqual(bobIdentity.rootWallet.address)
    })

    test('cantAddTipWithBadMetadata', async () => {
        // a user should not be able to upload a transaction with metadata that doesn't
        // match the receipt
    })
})
