/**
 * @group with-entitlements
 */

import { bin_toHexString, dlog, dlogError } from '@towns-protocol/dlog'
import { BigNumber, ethers } from 'ethers'
import { ETH_ADDRESS, LocalhostWeb3Provider } from '@towns-protocol/web3'
import { makeRiverConfig } from '../../riverConfig'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { Bot } from '../../sync-agent/utils/bot'
import { waitFor, waitForValue } from '../testUtils'
import { makeUniqueChannelStreamId } from '../../id'
import { randomBytes } from '../../utils'
import { TipEventObject } from '@towns-protocol/generated/dev/typings/ITipping'
import { deepCopy } from 'ethers/lib/utils'
import { cloneDeep } from 'lodash-es'
import { RiverTimelineEvent, TimelineEvent } from '../../views/models/timelineTypes'

const base_log = dlog('csb:test:transactions_Tip')
const logError = dlogError('csb:test:transactions_Tip_error')

describe('transactions_Tip', () => {
    const riverConfig = makeRiverConfig()
    const bobIdentity = new Bot(undefined, riverConfig)
    const bobsOtherWallet = ethers.Wallet.createRandom()
    const bobsOtherWalletProvider = new LocalhostWeb3Provider(
        riverConfig.base.rpcUrl,
        bobsOtherWallet,
    )
    const aliceIdentity = new Bot(undefined, riverConfig)
    const alicesOtherWallet = ethers.Wallet.createRandom()
    const chainId = riverConfig.base.chainConfig.chainId

    // updated once and shared between tests
    let bob: SyncAgent
    let alice: SyncAgent
    let spaceId: string
    let defaultChannelId: string
    let messageId: string
    let aliceTokenId: string
    let dummyReceipt: ethers.ContractReceipt
    let dummyTipEvent: TipEventObject
    let dummyTipEventCopy: TipEventObject

    beforeAll(async () => {
        // setup once
        const log = base_log.extend('beforeAll')
        log('start')

        // fund wallets
        await Promise.all([
            bobIdentity.fundWallet(),
            aliceIdentity.fundWallet(),
            bobsOtherWalletProvider.fundWallet(),
        ])

        bob = await bobIdentity.makeSyncAgent()
        alice = await aliceIdentity.makeSyncAgent()

        // start agents
        await Promise.all([
            bob.start(),
            alice.start(),
            bob.riverConnection.spaceDapp.walletLink.linkWalletToRootKey(
                bobIdentity.signer,
                bobsOtherWallet,
            ),
            alice.riverConnection.spaceDapp.walletLink.linkWalletToRootKey(
                aliceIdentity.signer,
                alicesOtherWallet,
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

        const aliceTokenId_ = await bob.riverConnection.spaceDapp.getTokenIdOfOwner(
            spaceId,
            aliceIdentity.rootWallet.address,
        )
        expect(aliceTokenId_).toBeDefined()
        aliceTokenId = aliceTokenId_!

        try {
            // dummy tip, to be used to test error cases
            const tx = await bob.riverConnection.spaceDapp.tip(
                {
                    spaceId,
                    tokenId: aliceTokenId,
                    currency: ETH_ADDRESS,
                    amount: 1000n,
                    messageId: messageId,
                    channelId: defaultChannelId,
                    receiver: aliceIdentity.rootWallet.address,
                },
                bobIdentity.signer,
            )
            dummyReceipt = await tx.wait(2)
            dummyTipEvent = bob.riverConnection.spaceDapp.getTipEvent(
                spaceId,
                dummyReceipt,
                bobIdentity.rootWallet.address, // if account abstraction is enabled, this is the abstract account address
            )!
        } catch (err) {
            const parsedError = bob.riverConnection.spaceDapp.parseSpaceError(spaceId, err)
            logError('parsedError', parsedError)
            throw err
        }
        expect(dummyTipEvent).toBeDefined()
        dummyTipEventCopy = deepCopy(dummyTipEvent)
        expect(dummyTipEventCopy).toEqual(dummyTipEvent)
    })

    afterEach(() => {
        expect(dummyTipEventCopy).toEqual(dummyTipEvent) // don't modify it please, it's used for error cases
    })

    afterAll(async () => {
        await bob.stop()
        await alice.stop()
    })

    test('addTip', async () => {
        // a user should be able to upload a transaction that
        // is a tip and is valid on chain
        const tx = await bob.riverConnection.spaceDapp.tip(
            {
                spaceId,
                tokenId: aliceTokenId,
                currency: ETH_ADDRESS,
                amount: 1000n,
                messageId: messageId,
                channelId: defaultChannelId,
                receiver: aliceIdentity.rootWallet.address,
            },
            bobIdentity.signer,
        )
        const receipt = await tx.wait(2)
        expect(receipt.from).toEqual(bobIdentity.rootWallet.address)
        const tipEvent = bob.riverConnection.spaceDapp.getTipEvent(
            spaceId,
            receipt,
            bobIdentity.rootWallet.address,
        )
        expect(tipEvent).toBeDefined()
        if (!tipEvent) throw new Error('no tip event found')
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                receipt,
                tipEvent,
                aliceIdentity.rootWallet.address,
            ),
        ).resolves.not.toThrow()
    })

    test('bobSeesTipInUserStream', async () => {
        // get the user "stream" that is being synced by bob
        const stream = bob.riverConnection.client!.stream(bob.riverConnection.client!.userStreamId!)
        if (!stream) throw new Error('no stream found')
        const tipEvent = await waitForValue(() => {
            const isUserBlockchainTransaction = (e: TimelineEvent) =>
                e.content?.kind === RiverTimelineEvent.UserBlockchainTransaction
            const tipEvents = stream.view.timeline.filter(isUserBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (!tip || tip.content?.kind !== RiverTimelineEvent.UserBlockchainTransaction)
                throw new Error('no tip event found')
            return tip.content?.transaction
        })
        expect(tipEvent?.receipt).toBeDefined()
        // the view should have been updated with the tip
        expect(stream.view.userContent.tipsSent[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.view.userContent.tipsSentCount[ETH_ADDRESS]).toEqual(1n)
        expect(stream.view.userContent.tipsReceived[ETH_ADDRESS]).toEqual(undefined)
    })

    test('aliceSeesTipReceivedInUserStream', async () => {
        // get the user "stream" that is being synced by alice
        const stream = alice.riverConnection.client!.stream(
            alice.riverConnection.client!.userStreamId!,
        )
        if (!stream) throw new Error('no stream found')
        const tipEvent = await waitForValue(() => {
            const isUserReceivedBlockchainTransaction = (e: TimelineEvent) =>
                e.content?.kind === RiverTimelineEvent.UserReceivedBlockchainTransaction
            const tipEvents = stream.view.timeline.filter(isUserReceivedBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (!tip || tip.content?.kind !== RiverTimelineEvent.UserReceivedBlockchainTransaction)
                throw new Error('no tip event found')
            return tip.content
        })
        if (!tipEvent) throw new Error('no tip event found')
        expect(tipEvent.receivedTransaction.transaction?.receipt).toBeDefined()
        expect(tipEvent?.receivedTransaction.transaction?.content?.case).toEqual('tip')
        // the view should have been updated with the tip
        expect(stream.view.userContent.tipsReceived[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.view.userContent.tipsReceivedCount[ETH_ADDRESS]).toEqual(1n)
    })

    test('bobSeesOnMessageInChannel', async () => {
        // get the channel "stream" that is being synced by bob
        const stream = bob.riverConnection.client!.stream(defaultChannelId)
        if (!stream) throw new Error('no stream found')
        const tipEvent = await waitForValue(() => {
            const isTipBlockchainTransaction = (e: TimelineEvent) =>
                e.content?.kind === RiverTimelineEvent.TipEvent
            const tipEvents = stream.view.timeline.filter(isTipBlockchainTransaction)
            expect(tipEvents.length).toBeGreaterThan(0)
            const tip = tipEvents[0]
            // make it compile
            if (
                !tip ||
                tip.content?.kind !== RiverTimelineEvent.TipEvent ||
                !tip.content.transaction
            )
                throw new Error('no tip event found')
            return tip.content
        })
        expect(tipEvent.fromUserId).toEqual(bobIdentity.rootWallet.address)
        expect(stream.view.membershipContent.tips[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.view.membershipContent.tipsCount[ETH_ADDRESS]).toEqual(1n)
        expect(
            stream.view.membershipContent.joined.get(bobIdentity.rootWallet.address)?.tipsSent?.[
                ETH_ADDRESS
            ],
        ).toEqual(1000n)
        expect(
            stream.view.membershipContent.joined.get(bobIdentity.rootWallet.address)
                ?.tipsSentCount?.[ETH_ADDRESS],
        ).toEqual(1n)
    })

    test('cantAddTipWithBadChannelId', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
                { disableTags: true },
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadMessageId', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.messageId = bin_toHexString(randomBytes(32))
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadSender', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.sender = aliceIdentity.rootWallet.address
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadReceiver', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.receiver = bobIdentity.rootWallet.address
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadAmount', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.amount = BigNumber.from(10000000n)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadCurrency', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.currency = '0x0000000000000000000000000000000000000000'
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                aliceIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadToUserAddress', async () => {
        const event = cloneDeep(dummyTipEvent)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                dummyReceipt,
                event,
                bobIdentity.rootWallet.address,
            ),
        ).rejects.toThrow('IsEntitled failed')
    })

    test('bobSnapshot', async () => {
        // force a snapshot of the user "stream" that is being synced by bob
        await bob.riverConnection.client!.debugForceMakeMiniblock(
            bob.riverConnection.client!.userStreamId!,
            { forceSnapshot: true },
        )
        // refetch the stream using getStream, make sure it parses the snapshot correctly
        const stream = await bob.riverConnection.client!.getStream(
            bob.riverConnection.client!.userStreamId!,
        )
        expect(stream.userContent.tipsSent[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.userContent.tipsReceived[ETH_ADDRESS]).toBeUndefined()
        expect(stream.userContent.tipsSentCount[ETH_ADDRESS]).toEqual(1n)
        expect(stream.userContent.tipsReceivedCount[ETH_ADDRESS]).toEqual(undefined)
    })

    test('aliceSnapshot', async () => {
        // force a snapshot of the user "stream" that is being synced by alice
        await alice.riverConnection.client!.debugForceMakeMiniblock(
            alice.riverConnection.client!.userStreamId!,
            { forceSnapshot: true },
        )
        // refetch the gtream using getStream, make sure it parses the snapshot correctly
        const stream = await alice.riverConnection.client!.getStream(
            alice.riverConnection.client!.userStreamId!,
        )
        expect(stream.userContent.tipsReceived[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.userContent.tipsSent[ETH_ADDRESS]).toBeUndefined()
        expect(stream.userContent.tipsReceivedCount[ETH_ADDRESS]).toEqual(1n)
        expect(stream.userContent.tipsSentCount[ETH_ADDRESS]).toEqual(undefined)
    })

    test('channelSnapshot', async () => {
        // force a snapshot of the channel "stream" that is being synced by bob
        await bob.riverConnection.client!.debugForceMakeMiniblock(defaultChannelId, {
            forceSnapshot: true,
        })
        // refetch the stream using getStream, make sure it parses the snapshot correctly
        const stream = await bob.riverConnection.client!.getStream(defaultChannelId)
        if (!stream) throw new Error('no stream found')
        expect(stream.membershipContent.tips[ETH_ADDRESS]).toEqual(1000n)
        expect(stream.membershipContent.tipsCount[ETH_ADDRESS]).toEqual(1n)
        const bobMember = stream.membershipContent.joined.get(bobIdentity.rootWallet.address)
        const aliceMember = stream.membershipContent.joined.get(aliceIdentity.rootWallet.address)
        expect(bobMember?.tipsSent?.[ETH_ADDRESS]).toEqual(1000n)
        expect(bobMember?.tipsSentCount?.[ETH_ADDRESS]).toEqual(1n)
        expect(aliceMember?.tipsReceived?.[ETH_ADDRESS]).toEqual(1000n)
        expect(aliceMember?.tipsReceivedCount?.[ETH_ADDRESS]).toEqual(1n)
    })

    test('addSecondTip', async () => {
        // a user should be able to upload a transaction that
        // is a tip and is valid on chain
        const tx = await bob.riverConnection.spaceDapp.tip(
            {
                spaceId,
                tokenId: aliceTokenId,
                currency: ETH_ADDRESS,
                amount: 1000n,
                messageId: messageId,
                channelId: defaultChannelId,
                receiver: aliceIdentity.rootWallet.address,
            },
            bobIdentity.signer,
        )
        const receipt = await tx.wait(2)
        expect(receipt.from).toEqual(bobIdentity.rootWallet.address)
        const tipEvent = bob.riverConnection.spaceDapp.getTipEvent(
            spaceId,
            receipt,
            bobIdentity.rootWallet.address,
        )
        expect(tipEvent).toBeDefined()
        if (!tipEvent) throw new Error('no tip event found')
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(
                chainId,
                receipt,
                tipEvent,
                aliceIdentity.rootWallet.address,
            ),
        ).resolves.not.toThrow()
    })

    test('bobSeesSecondTipInUserStream', async () => {
        // get the user "stream" that is being synced by bob
        const stream = bob.riverConnection.client!.stream(bob.riverConnection.client!.userStreamId!)
        if (!stream) throw new Error('no stream found')
        // the view should have been updated with the tip
        await waitFor(() => {
            expect(stream.view.userContent.tipsSent[ETH_ADDRESS]).toEqual(2000n)
            expect(stream.view.userContent.tipsSentCount[ETH_ADDRESS]).toEqual(2n)
            expect(stream.view.userContent.tipsReceived[ETH_ADDRESS]).toEqual(undefined)
        })
    })

    test('aliceSeesSecondTipReceivedInUserStream', async () => {
        // get the user "stream" that is being synced by alice
        const stream = alice.riverConnection.client!.stream(
            alice.riverConnection.client!.userStreamId!,
        )
        if (!stream) throw new Error('no stream found')
        // the view should have been updated with the tip
        await waitFor(() => {
            expect(stream.view.userContent.tipsReceived[ETH_ADDRESS]).toEqual(2000n)
            expect(stream.view.userContent.tipsReceivedCount[ETH_ADDRESS]).toEqual(2n)
        })
    })
})
