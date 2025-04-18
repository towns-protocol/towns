/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    Client,
    makeBaseProvider,
    makeRiverConfig,
    makeRiverProvider,
    makeRiverRpcClient,
    MockEntitlementsDelegate,
    RiverDbManager,
    userIdFromAddress,
    waitFor,
    type AppRegistryRpcClient,
    type SyncAgent,
} from '@towns-protocol/sdk'
import { describe, it, expect } from 'vitest'
import type { Bot } from './bot'
import { Bot as SyncAgentTest, AppRegistryService, makeSignerContext } from '@towns-protocol/sdk'
import { bin_fromHexString, bin_toString, bin_toBase64 } from '@towns-protocol/dlog'
import { makeTownsBot } from './bot'
import { ethers } from 'ethers'
import { AppPrivateDataSchema, ForwardSettingValue } from '@towns-protocol/proto'
import { toBinary, create } from '@bufbuild/protobuf'
import { SpaceDapp } from '@towns-protocol/web3'
import { createSecureServer } from 'node:http2'
import { serve } from '@hono/node-server'
import fs from 'node:fs'
import path from 'node:path'

const WEBHOOK_URL = `https://localhost:${process.env.BOT_PORT}/webhook`

describe('Bot', { sequential: true }, () => {
    const riverConfig = makeRiverConfig()

    const bob = new SyncAgentTest(undefined, riverConfig)
    let bobClient: SyncAgent

    const alice = new SyncAgentTest(undefined, riverConfig)
    let aliceClient: SyncAgent

    let bot: Bot
    let spaceId: string
    let channelId: string
    let botWallet: ethers.Wallet
    let appPrivateDataBase64: string
    let jwtSecret: string
    let appRegistryRpcClient: AppRegistryRpcClient
    const botEvents: { messages: string[]; joined: string[] } = { messages: [], joined: [] }
    let appId: Uint8Array

    it('should initialize bot owner (bob) sync agent and alice (regular user)', async () => {
        await Promise.all([bob.fundWallet(), alice.fundWallet()])
        bobClient = await bob.makeSyncAgent()
        aliceClient = await alice.makeSyncAgent()
        await Promise.all([bobClient.start(), aliceClient.start()])
        const { spaceId: spaceId_, defaultChannelId } = await bobClient.spaces.createSpace(
            { spaceName: 'bobs-space' },
            bob.signer,
        )
        spaceId = spaceId_
        channelId = defaultChannelId
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()
    })

    it('should create a bot client using bot owner signer', async () => {
        botWallet = ethers.Wallet.createRandom()
        const delegateWallet = ethers.Wallet.createRandom()
        const signerContext = await makeSignerContext(botWallet, delegateWallet)

        const spaceDapp = new SpaceDapp(riverConfig.base.chainConfig, makeBaseProvider(riverConfig))
        const riverProvider = makeRiverProvider(riverConfig)
        const rpcClient = await makeRiverRpcClient(riverProvider, riverConfig.river.chainConfig)
        const botUserId = userIdFromAddress(signerContext.creatorAddress)
        const cryptoStore = RiverDbManager.getCryptoDb(botUserId)

        const { issued } = await spaceDapp.joinSpace(spaceId, botWallet.address, bob.signer)
        expect(issued).toBe(true)

        const botClient = new Client(
            signerContext,
            rpcClient,
            cryptoStore,
            new MockEntitlementsDelegate(),
        )
        await botClient.initializeUser({ spaceId })
        await botClient.joinUser(spaceId, botWallet.address)
        await botClient.joinStream(channelId, {
            skipWaitForUserStreamUpdate: true,
            skipWaitForMiniblockConfirmation: true,
        })
        await botClient.uploadDeviceKeys()

        const exportedDevice = await botClient.cryptoBackend?.exportDevice()
        expect(exportedDevice).toBeDefined()
        appPrivateDataBase64 = bin_toBase64(
            toBinary(
                AppPrivateDataSchema,
                create(AppPrivateDataSchema, {
                    privateKey: botWallet.privateKey,
                    encryptionDevice: exportedDevice,
                }),
            ),
        )
        expect(appPrivateDataBase64).toBeDefined()
        appId = bin_fromHexString(botWallet.address)
    })

    it('should register a bot in app registry', async () => {
        const { appRegistryRpcClient: rpcClient } = await AppRegistryService.authenticateWithSigner(
            bob.userId,
            bob.signer,
            process.env.APP_REGISTRY_URL!,
        )
        appRegistryRpcClient = rpcClient
        const { hs256SharedSecret } = await appRegistryRpcClient.register({
            appId,
            appOwnerId: bin_fromHexString(bob.userId),
        })
        jwtSecret = bin_toString(hs256SharedSecret)
        expect(jwtSecret).toBeDefined()
    })

    it('should run the bot server and register the webhook in app registry', async () => {
        bot = await makeTownsBot(appPrivateDataBase64, jwtSecret, process.env.RIVER_ENV)
        expect(bot).toBeDefined()
        expect(bot.botId).toBe(botWallet.address)
        const { fetch } = await bot.start()
        serve({
            port: Number(process.env.BOT_PORT!),
            fetch,
            createServer: createSecureServer,
            serverOptions: {
                // TODO: mkcert localhost in CI
                key: fs.readFileSync(path.join(__dirname, '../certs', 'localhost+2-key.pem')),
                cert: fs.readFileSync(path.join(__dirname, '../certs', 'localhost+2.pem')),
                allowHTTP1: false,
            },
        })
        await appRegistryRpcClient.registerWebhook({
            appId,
            webhookUrl: WEBHOOK_URL,
        })

        // Verify webhook registration
        const { isRegistered, validResponse } = await appRegistryRpcClient.getStatus({
            appId,
        })
        expect(isRegistered).toBe(true)
        expect(validResponse).toBe(true)
    })

    it('should receive a message forwarded', async () => {
        bot.onMessage((_h, { message }) => {
            botEvents.messages.push(message)
        })
        await appRegistryRpcClient.setAppSettings({
            appId,
            settings: {
                forwardSetting: ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES,
            },
        })
        const TEST_MESSAGE = 'Hello bot!'
        // wait for the bot to be ready
        await new Promise((resolve) => setTimeout(resolve, 2500))

        await bobClient.spaces.getSpace(spaceId).getChannel(channelId).sendMessage(TEST_MESSAGE)
        await waitFor(() => botEvents.messages.length > 0)
        expect(botEvents.messages).toContain(TEST_MESSAGE)
        botEvents.messages = []
    })

    it('should not receive messages when forwarding is set to no messages', async () => {
        await appRegistryRpcClient.setAppSettings({
            appId,
            settings: {
                forwardSetting: ForwardSettingValue.FORWARD_SETTING_NO_MESSAGES,
            },
        })

        const TEST_MESSAGE = 'This message should not be forwarded'
        await bobClient.spaces.getSpace(spaceId).getChannel(channelId).sendMessage(TEST_MESSAGE)

        await new Promise((resolve) => setTimeout(resolve, 2500))
        expect(botEvents.messages).toHaveLength(0)
    })

    it('should receive channel join event when alice joins the channel if bot is listening to channel join events', async () => {
        await appRegistryRpcClient.setAppSettings({
            appId,
            settings: {
                forwardSetting: ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES,
            },
        })
        bot.onChannelJoin((_h, { userId }) => {
            botEvents.joined.push(userId)
        })
        await aliceClient.spaces.joinSpace(spaceId, alice.signer)
        await waitFor(() => botEvents.joined.length > 0)
        expect(botEvents.joined).toContain(alice.userId)
    })

    // TODO: onMentioned
    // TODO: onReaction
    // TODO: onRedaction
    // TODO: onTip
})
