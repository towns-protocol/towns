import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove
import {
    isDecryptedEvent,
    makeRiverConfig,
    makeSignerContext,
    makeStreamRpcClient,
    NotificationService,
    randomUrlSelector,
} from '@river-build/sdk'
import { check } from '@river-build/dlog'
import {
    DmChannelSettingValue,
    GdmChannelSettingValue,
    GetSettingsRequest,
    InfoRequest,
    SetDmGdmSettingsRequest,
} from '@river-build/proto'
import { EncryptionDelegate } from '@river-build/encryption'
import { makeStressClient } from './utils/stressClient'
import { expect, isSet } from './utils/expect'
import { getSystemInfo } from './utils/systemInfo'
import { waitFor } from './utils/waitFor'
import { ethers, Wallet } from 'ethers'
import { RedisStorage } from './utils/storage'
import { createRiverRegistry } from '@river-build/web3'
import { getLogger } from './utils/logger'

check(isSet(process.env.RIVER_ENV), 'process.env.RIVER_ENV')

const logger = getLogger('stress:index')
const config = makeRiverConfig(process.env.RIVER_ENV)
logger.info(config, 'config')

function getRootWallet() {
    check(isSet(process.env.MNEMONIC), 'process.env.MNEMONIC')
    const mnemonic = process.env.MNEMONIC
    const wallet = Wallet.fromMnemonic(mnemonic)
    return wallet
}

async function spamInfo(count: number) {
    const staticRiverProvider = new ethers.providers.StaticJsonRpcProvider(config.river.rpcUrl)
    const riverRegistry = createRiverRegistry(staticRiverProvider, config.river.chainConfig)
    const urls = await riverRegistry.getOperationalNodeUrls()
    const selectedUrl = randomUrlSelector(urls)
    const rpcClient = makeStreamRpcClient(selectedUrl, () => riverRegistry.getOperationalNodeUrls())
    for (let i = 0; i < count; i++) {
        logger.debug({ iteration: i }, 'iteration')
        const info = await rpcClient.info(new InfoRequest({}), {
            timeoutMs: 10000,
        })
        logger.info(getSystemInfo(), 'system info')
        logger.info({ info, iteration: i }, `info`)
    }
}

async function sendAMessage() {
    logger.debug('=======================send a message - start =======================')
    const bob = await makeStressClient(config, 0, getRootWallet(), undefined)
    const { spaceId, defaultChannelId } = await bob.createSpace("bob's space")
    await bob.sendMessage(defaultChannelId, 'hello')

    logger.debug('=======================send a message - make alice =======================')
    const alice = await makeStressClient(config, 1, undefined, undefined)
    await bob.spaceDapp.joinSpace(
        spaceId,
        alice.baseProvider.wallet.address,
        bob.baseProvider.wallet,
    )
    await alice.joinSpace(spaceId, { skipMintMembership: true })
    logger.debug('=======================send a message - alice join space =======================')
    const channel = await alice.streamsClient.waitForStream(defaultChannelId)
    logger.debug('=======================send a message - alice wait =======================')
    await waitFor(() => channel.view.timeline.filter(isDecryptedEvent).length > 0)
    logger.debug('alices sees: ', channel.view.timeline.filter(isDecryptedEvent))
    logger.debug('=======================send a message - alice sends =======================')
    await alice.sendMessage(defaultChannelId, 'hi bob')
    logger.debug('=======================send a message - alice sent =======================')
    const bobChannel = await bob.streamsClient.waitForStream(defaultChannelId)
    logger.debug('=======================send a message - bob wait =======================')
    await waitFor(() => bobChannel.view.timeline.filter(isDecryptedEvent).length > 0) // bob doesn't decrypt his own messages
    logger.debug(bobChannel.view.timeline.filter(isDecryptedEvent), 'bob sees')

    await bob.stop()
    await alice.stop()
    logger.debug('=======================send a message - done =======================')
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    logger.debug({ keys: bobOneTimeKeys }, 'bobOneTimeKeys')
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
    logger.debug({ decrypted, from: 'bob' }, 'decrypted ciphertext')
    expect(decrypted).toEqual(TEST_TEXT)

    TEST_TEXT = 'test message for alice'
    encrypted = bobSession.encrypt(TEST_TEXT)
    expect(encrypted.type).toEqual(1)
    decrypted = aliceSession.decrypt(encrypted.type, encrypted.body)
    logger.debug({ decrypted, from: 'alice' }, 'decrypted ciphertext')
    expect(decrypted).toEqual(TEST_TEXT)

    aliceAccount.free()
    bobAccount.free()
}

async function demoExternalStorage() {
    if (isSet(process.env.REDIS_HOST)) {
        const storage = new RedisStorage(process.env.REDIS_HOST)
        const value = await storage.get('demo_key')
        logger.debug(value, 'value')
        const nextValue = value ? parseInt(value) + 1 : 1
        await storage.set('demo_key', nextValue.toString())
        const newValue = await storage.get('demo_key')
        logger.debug({ from: value, to: newValue }, 'value updated')
    }
}

const registerNotificationService = async () => {
    // demo connecting to the notification service
    const notificationServiceUrl = 'https://river-notification-service-alpha.towns.com/' // ?? 'http://localhost:4040
    if (!notificationServiceUrl) {
        logger.info('NOTIFICATION_SERVICE_URL is not set')
        return
    }

    const wallet = ethers.Wallet.createRandom()
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(wallet, delegateWallet, { days: 1 })

    const { startResponse, finishResponse, notificationRpcClient } =
        await NotificationService.authenticate(signerContext, notificationServiceUrl)
    logger.info({ startResponse, finishResponse }, 'authenticated')

    let settings = await notificationRpcClient.getSettings(new GetSettingsRequest())
    logger.info(settings.toJson(), 'settings')

    const response = await notificationRpcClient.setDmGdmSettings(
        new SetDmGdmSettingsRequest({
            dmGlobal: DmChannelSettingValue.DM_MESSAGES_NO,
            gdmGlobal: GdmChannelSettingValue.GDM_MESSAGES_NO,
        }),
    )
    logger.info(response, 'set settings response')
    settings = await notificationRpcClient.getSettings(new GetSettingsRequest())
    logger.info(settings.toJson(), 'new settings')
}

logger.info(getSystemInfo(), 'system info')

const run = async () => {
    logger.debug('========================registerNotificationService========================')
    await registerNotificationService()
    logger.debug('========================storage========================')
    await demoExternalStorage()
    logger.debug('==========================spamInfo==========================')
    await spamInfo(1)
    logger.debug('=======================encryptDecrypt=======================')
    await encryptDecrypt()
    logger.debug('========================sendAMessage========================')
    await sendAMessage()
    process.exit(0)
}

run().catch((e) => {
    logger.error(e, 'unhandled error:')
    process.exit(1)
})
