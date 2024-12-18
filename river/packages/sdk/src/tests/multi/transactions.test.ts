/**
 * @group with-entitlements
 */

import { dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { makeRiverConfig } from '../../riverConfig'
import { SyncAgent } from '../../sync-agent/syncAgent'
import { Bot } from '../../sync-agent/utils/bot'
import crypto from 'crypto'
import cloneDeep from 'lodash/cloneDeep'
import { deepCopy } from 'ethers/lib/utils'

const base_log = dlog('csb:test:transactions')

describe('transactions', () => {
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
    // updated before each test
    let dummyReceipt: ethers.ContractReceipt
    let dummyReceiptCopy: ethers.ContractReceipt

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
            { spaceName: 'BlastOff' },
            bobIdentity.signer,
        )
        spaceId = sid
        defaultChannelId = cid

        await alice.spaces.joinSpace(spaceId, aliceIdentity.signer)
        log('bob and alice joined space', spaceId, defaultChannelId)

        const transaction = await bobIdentity.web3Provider.mintMockNFT(riverConfig.base.chainConfig)
        dummyReceipt = await transaction.wait(2)
        dummyReceiptCopy = deepCopy(dummyReceipt)
        expect(dummyReceiptCopy).toEqual(dummyReceipt)
    })

    afterEach(() => {
        // for speed we share a receipt between tests, don't modify it
        expect(dummyReceiptCopy).toEqual(dummyReceipt)
    })

    test('addEvent', async () => {
        // a user should be able to upload a transaction that
        // is from their account or one of their linked accounts and
        // is valid on chain
        // add the transaction to the river chain
        const transaction = await bobIdentity.web3Provider.mintMockNFT(riverConfig.base.chainConfig)
        const receipt = await transaction.wait(2)
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, receipt),
        ).resolves.not.toThrow()
    })

    test('cantAddEventTwice', async () => {
        const transaction = await bobIdentity.web3Provider.mintMockNFT(riverConfig.base.chainConfig)
        const receipt = await transaction.wait(2)
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, receipt),
        ).resolves.not.toThrow()
        // can't add the same transaction twice
        await expect(bob.riverConnection.client!.addTransaction(chainId, receipt)).rejects.toThrow(
            'duplicate transaction',
        )
    })

    test('cantAddEventFromOtherUser', async () => {
        // alice should not be able to add the transaction to the river
        await expect(
            alice.riverConnection.client!.addTransaction(chainId, dummyReceipt),
        ).rejects.toThrow()
    })

    test('cantModifyReceiptFrom', async () => {
        // if we modify the dummyReceipt from, it should not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt) // deepCopy is imutable
        modifiedReceipt.from = await aliceIdentity.signer.getAddress()
        await expect(
            alice.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('From address mismatch')
    })

    test('cantModifyReceiptTo', async () => {
        // if we modify the dummyReceipt from, it should not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.to = await aliceIdentity.signer.getAddress()
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('To address mismatch')
    })

    test('cantAddEventWithAdditionalWrongBlockNumber', async () => {
        // modifying the logs by adding additional logs should also not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.blockNumber -= 1
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Block number mismatch')
    })

    test('cantAddEventWithAdditionalLogs', async () => {
        // modifying the logs by adding additional logs should also not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.logs.push(modifiedReceipt.logs[0])
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Log count mismatch')
    })

    test('cantModifyReceiptLogData', async () => {
        // modify existing log should not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.logs[0].data = crypto.randomBytes(32).toString('hex')
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Log data mismatch')
    })

    test('cantModifyReceiptLogAddress', async () => {
        // modify existing log should not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.logs[0].address = crypto.randomBytes(32).toString('hex')
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Log address mismatch')
    })

    test('cantModifyReceiptLogTopics', async () => {
        // modify existing log should not be accepted
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.logs[0].topics[0] = crypto.randomBytes(32).toString('hex')
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Log topic mismatch')
    })

    test('cantModifyReceiptLogTopicsCount', async () => {
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.logs[0].topics.push(crypto.randomBytes(32).toString('hex'))
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow('Log topics count mismatch')
    })

    test('cantAddEventWithInvalidHash', async () => {
        // send dummyReceipt with invalid hash
        const modifiedReceipt = cloneDeep(dummyReceipt)
        modifiedReceipt.transactionHash = crypto.randomBytes(32).toString('hex')
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, modifiedReceipt),
        ).rejects.toThrow()
    })

    test('addEventFromLinkedWallet', async () => {
        // a user should be able to upload a transaction that
        // is from one of their linked accounts and is valid on chain
        const transaction = await bobsOtherWalletProvider.mintMockNFT(riverConfig.base.chainConfig)
        const receipt = await transaction.wait()

        // add the transaction to the river
        await expect(
            bob.riverConnection.client!.addTransaction(chainId, receipt),
        ).resolves.not.toThrow()
    })

    test('cantAddEventFromUnlinkedLinkedWallet', async () => {
        // a user should not be able to upload a transaction that
        // is from one of their linked accounts and is valid on chain
        const transaction = await bobsOtherWalletProvider.mintMockNFT(riverConfig.base.chainConfig)
        const receipt = await transaction.wait()

        // add the transaction to the river
        await expect(
            alice.riverConnection.client!.addTransaction(chainId, receipt),
        ).rejects.toThrow()
    })
})
