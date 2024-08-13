import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import { isDecryptedEvent, makeRiverConfig } from '@river-build/sdk'
import { check, dlogger } from '@river-build/dlog'
import { InfoRequest } from '@river-build/proto'
import { EncryptionDelegate } from '@river-build/encryption'
import { makeConnection } from './utils/connection'
import { makeStressClient } from './utils/stressClient'
import { expect, isSet } from './utils/expect'
import { printSystemInfo } from './utils/systemInfo'
import { waitFor } from './utils/waitFor'
import { Wallet } from 'ethers'
import { RedisStorage } from './utils/storage'

check(isSet(process.env.RIVER_ENV), 'process.env.RIVER_ENV')

const logger = dlogger('stress:index')
const config = makeRiverConfig(process.env.RIVER_ENV)
logger.info('config', config)

function getRootWallet() {
    check(isSet(process.env.MNEMONIC), 'process.env.MNEMONIC')
    const mnemonic = process.env.MNEMONIC
    const wallet = Wallet.fromMnemonic(mnemonic)
    return wallet
}

async function spamInfo(count: number) {
    const connection = await makeConnection(config)
    const { rpcClient } = connection
    for (let i = 0; i < count; i++) {
        logger.log(`iteration ${i}`)
        const info = await rpcClient.info(new InfoRequest({}), {
            timeoutMs: 10000,
        })
        printSystemInfo(logger)
        logger.log(`info ${i}`, info)
    }
}

async function sendAMessage() {
    logger.log('=======================send a message - start =======================')
    const bob = await makeStressClient(config, 0, getRootWallet(), undefined)
    const { spaceId, defaultChannelId } = await bob.createSpace("bob's space")
    await bob.sendMessage(defaultChannelId, 'hello')

    logger.log('=======================send a message - make alice =======================')
    const alice = await makeStressClient(config, 1, undefined, undefined)
    await bob.spaceDapp.joinSpace(
        spaceId,
        alice.baseProvider.wallet.address,
        bob.baseProvider.wallet,
    )
    await alice.joinSpace(spaceId, { skipMintMembership: true })
    logger.log('=======================send a message - alice join space =======================')
    const channel = await alice.streamsClient.waitForStream(defaultChannelId)
    logger.log('=======================send a message - alice wait =======================')
    await waitFor(() => channel.view.timeline.filter(isDecryptedEvent).length > 0)
    logger.log('alices sees: ', channel.view.timeline.filter(isDecryptedEvent))
    logger.log('=======================send a message - alice sends =======================')
    await alice.sendMessage(defaultChannelId, 'hi bob')
    logger.log('=======================send a message - alice sent =======================')
    const bobChannel = await bob.streamsClient.waitForStream(defaultChannelId)
    logger.log('=======================send a message - bob wait =======================')
    await waitFor(() => bobChannel.view.timeline.filter(isDecryptedEvent).length > 0) // bob doesn't decrypt his own messages
    logger.log('bob sees: ', bobChannel.view.timeline.filter(isDecryptedEvent))

    await bob.stop()
    await alice.stop()
    logger.log('=======================send a message - done =======================')
}

async function encryptDecrypt() {
    const delegate = new EncryptionDelegate()
    await delegate.init()
    const aliceAccount = delegate.createAccount()
    const bobAccount = delegate.createAccount()
    const aliceSession = delegate.createSession()
    const bobSession = delegate.createSession()

    aliceAccount.create()
    bobAccount.create()

    // public one time key for pre-key message generation to establish the session
    bobAccount.generate_one_time_keys(2)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const bobOneTimeKeys = JSON.parse(bobAccount.one_time_keys()).curve25519
    logger.info('bobOneTimeKeys', bobOneTimeKeys)
    bobAccount.mark_keys_as_published()

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const bobIdKey = JSON.parse(bobAccount?.identity_keys()).curve25519
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const otkId = Object.keys(bobOneTimeKeys)[0]
    // create outbound sessions using bob's one time key
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    aliceSession.create_outbound(aliceAccount, bobIdKey, bobOneTimeKeys[otkId])
    let TEST_TEXT = 'test message for bob'
    let encrypted = aliceSession.encrypt(TEST_TEXT)
    expect(encrypted.type).toEqual(0)

    // create inbound sessions using own account and encrypted body from alice
    bobSession.create_inbound(bobAccount, encrypted.body)
    bobAccount.remove_one_time_keys(bobSession)

    let decrypted = bobSession.decrypt(encrypted.type, encrypted.body)
    logger.info('bob decrypted ciphertext: ', decrypted)
    expect(decrypted).toEqual(TEST_TEXT)

    TEST_TEXT = 'test message for alice'
    encrypted = bobSession.encrypt(TEST_TEXT)
    expect(encrypted.type).toEqual(1)
    decrypted = aliceSession.decrypt(encrypted.type, encrypted.body)
    logger.info('alice decrypted ciphertext: ', decrypted)
    expect(decrypted).toEqual(TEST_TEXT)

    aliceAccount.free()
    bobAccount.free()
}

async function demoExternalStoreage() {
    if (isSet(process.env.REDIS_HOST)) {
        const storage = new RedisStorage(process.env.REDIS_HOST)
        const value = await storage.get('demo_key')
        logger.info('value', value)
        const nextValue = value ? parseInt(value) + 1 : 1
        await storage.set('demo_key', nextValue.toString())
        const newValue = await storage.get('demo_key')
        logger.info('value updated', { from: value, to: newValue })
    }
}

printSystemInfo(logger)

const run = async () => {
    logger.log('========================storage========================')
    await demoExternalStoreage()
    logger.log('==========================spamInfo==========================')
    await spamInfo(1)
    logger.log('=======================encryptDecrypt=======================')
    await encryptDecrypt()
    logger.log('========================sendAMessage========================')
    await sendAMessage()
    process.exit(0)
}

run().catch((e) => {
    logger.error('unhandled error:', e)
    process.exit(1)
})
