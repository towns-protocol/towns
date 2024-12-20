/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import { BigNumber, ethers } from 'ethers'
import { ETH_ADDRESS, LocalhostWeb3Provider } from '@river-build/web3'
import { makeRiverConfig } from '../../riverConfig'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { Bot } from '../../sync-agent/utils/bot'
import { waitFor } from '../testUtils'
import { StreamTimelineEvent } from '../../types'
import { ReceivedBlockchainTransactionKind } from '@river-build/proto'
import { userIdFromAddress, makeUniqueChannelStreamId } from '../../id'
import { randomBytes } from 'crypto'
import { TipEventObject } from '@river-build/generated/dev/typings/ITipping'
import { deepCopy } from 'ethers/lib/utils'
import { cloneDeep } from 'lodash'

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

        // dummy tip, to be used to test error cases
        const tx = await bob.riverConnection.spaceDapp.tip(
            {
                spaceId,
                tokenId: aliceTokenId,
                currency: ETH_ADDRESS,
                amount: 1000n,
                messageId: messageId,
                channelId: defaultChannelId,
            },
            bobIdentity.signer,
        )
        dummyReceipt = await tx.wait(2)
        dummyTipEvent = bob.riverConnection.spaceDapp.getTipEvent(
            spaceId,
            dummyReceipt,
            bobIdentity.rootWallet.address, // if account abstraction is enabled, this is the abstract account address
        )!
        expect(dummyTipEvent).toBeDefined()
        dummyTipEventCopy = deepCopy(dummyTipEvent)
        expect(dummyTipEventCopy).toEqual(dummyTipEvent)
    })

    afterEach(() => {
        expect(dummyTipEventCopy).toEqual(dummyTipEvent) // don't modify it please
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
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, receipt, tipEvent!),
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

    test('cantAddTipWithBadChannelId', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, dummyReceipt, event),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadMessageId', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.messageId = randomBytes(32).toString('hex')
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, dummyReceipt, event),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadFromUserAddress', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.sender = aliceIdentity.rootWallet.address
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, dummyReceipt, event),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadAmount', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.amount = BigNumber.from(10000000n)
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, dummyReceipt, event),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })

    test('cantAddTipWithBadCurrency', async () => {
        const event = cloneDeep(dummyTipEvent)
        event.currency = '0x0000000000000000000000000000000000000000'
        await expect(
            bob.riverConnection.client!.addTransaction_Tip(chainId, dummyReceipt, event),
        ).rejects.toThrow('matching tip event not found in receipt logs')
    })
})
