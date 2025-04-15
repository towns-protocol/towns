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
import { AppPrivateDataSchema } from '@towns-protocol/proto'
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

    let bot: Bot
    let spaceId: string
    let channelId: string
    let botWallet: ethers.Wallet
    let appPrivateDataBase64: string
    let jwtSecret: string
    let appRegistryRpcClient: AppRegistryRpcClient
    const messages: string[] = []

    it('should initialize bot owner (bob) sync agent', async () => {
        await bob.fundWallet()
        bobClient = await bob.makeSyncAgent()
        await bobClient.start()
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
    })

    it('should register a bot in app registry', async () => {
        const { appRegistryRpcClient: rpcClient } = await AppRegistryService.authenticateWithSigner(
            bob.userId,
            bob.signer,
            process.env.APP_REGISTRY_URL!,
        )
        appRegistryRpcClient = rpcClient
        const appId = bin_fromHexString(botWallet.address)
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
        bot.onMessage((_h, { message }) => {
            messages.push(message)
        })
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
        const appId = bin_fromHexString(botWallet.address)
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
        const TEST_MESSAGE = 'Hello bot!'
        // wait for the bot to be ready
        await new Promise((resolve) => setTimeout(resolve, 2500))

        process.stdout.write(`[TEST] Sending test message: ${TEST_MESSAGE}\n`)
        await bobClient.spaces.getSpace(spaceId).getChannel(channelId).sendMessage(TEST_MESSAGE)
        await waitFor(() => messages.length > 0)
        expect(messages).toContain(TEST_MESSAGE)
    })

    // TODO: onMentioned
    // TODO: onReaction
    // TODO: onRedaction
    // TODO: onTip
    // TODO: update bot settings
})
