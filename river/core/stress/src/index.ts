import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import os from 'os'
import { isDecryptedEvent, makeRiverConfig } from '@river/sdk'
import { dlogger } from '@river-build/dlog'
import { InfoRequest } from '@river-build/proto'
import { EncryptionDelegate } from '@river-build/encryption'
import { makeConnection } from './connection'
import { makeStressClient } from './stressClient'
import { expect } from './expect'

const logger = dlogger('csb:stress:run')
const config = makeRiverConfig()
logger.info('config', config)

function printSystemInfo() {
    logger.log('System Info:', {
        OperatingSystem: `${os.type()} ${os.release()}`,
        SystemUptime: `${os.uptime()} seconds`,
        TotalMemory: `${os.totalmem() / 1024 / 1024} MB`,
        FreeMemory: `${os.freemem() / 1024 / 1024} MB`,
        CPUCount: `${os.cpus().length}`,
        CPUModel: `${os.cpus()[0].model}`,
        CPUSpeed: `${os.cpus()[0].speed} MHz`,
    })
}

async function spamInfo(count: number) {
    const connection = await makeConnection(config)
    const { rpcClient } = connection
    for (let i = 0; i < count; i++) {
        logger.log(`iteration ${i}`)
        const info = await rpcClient.info(new InfoRequest({}), {
            timeoutMs: 10000,
        })
        printSystemInfo()
        logger.log(`info ${i}`, info)
    }
}

async function waitFor(condition: () => boolean, timeoutMs = 10000) {
    const start = Date.now()
    while (!condition()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error('timeout')
        }
        await new Promise((resolve) => setTimeout(resolve, 100))
    }
}

export async function sendAMessage() {
    logger.log('=======================send a message - start =======================')
    const bob = await makeStressClient(config)
    await bob.fundWallet()
    const { spaceId, defaultChannelId } = await bob.createSpace("bob's space")
    await bob.sendMessage(defaultChannelId, 'hello')

    logger.log('=======================send a message - alice =======================')
    const alice = await makeStressClient(config)
    await alice.fundWallet()
    await alice.joinSpace(spaceId)
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

printSystemInfo()

await spamInfo(1)
await encryptDecrypt()
await sendAMessage()

process.exit(0)
