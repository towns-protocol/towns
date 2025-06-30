import {
    Client,
    makeBaseProvider,
    makeRiverConfig,
    makeRiverProvider,
    makeRiverRpcClient,
    makeSignerContext,
    MockEntitlementsDelegate,
    RiverDbManager,
    waitFor,
    type AppRegistryRpcClient,
    type Channel,
    type SyncAgent,
} from '@towns-protocol/sdk'
import { describe, it, expect, beforeAll } from 'vitest'
import type { Bot, BotPayload, UserData } from './bot'
import { Bot as SyncAgentTest, AppRegistryService, getAppRegistryUrl } from '@towns-protocol/sdk'
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/dlog'
import { makeTownsBot } from './bot'
import { ethers } from 'ethers'
import { AppPrivateDataSchema, ForwardSettingValue } from '@towns-protocol/proto'
import { toBinary, create } from '@bufbuild/protobuf'
import {
    AppRegistryDapp,
    ETH_ADDRESS,
    Permission,
    SpaceAddressFromSpaceId,
    SpaceDapp,
    type Address,
} from '@towns-protocol/web3'
import { createServer } from 'node:http2'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'

const WEBHOOK_URL = `https://localhost:${process.env.BOT_PORT}/webhook`

type OnMessageType = BotPayload<'message'>
type OnChannelJoin = BotPayload<'channelJoin'>
type OnMessageEditType = BotPayload<'messageEdit'>
type OnThreadMessageType = BotPayload<'threadMessage'>
type OnMentionedType = BotPayload<'mentioned'>

describe('Bot', { sequential: true }, () => {
    const riverConfig = makeRiverConfig()

    const bob = new SyncAgentTest(undefined, riverConfig)
    const appRegistryDapp = new AppRegistryDapp(
        riverConfig.base.chainConfig,
        makeBaseProvider(riverConfig),
    )
    const spaceDapp = new SpaceDapp(riverConfig.base.chainConfig, makeBaseProvider(riverConfig))
    let bobClient: SyncAgent

    const alice = new SyncAgentTest(undefined, riverConfig)
    let aliceClient: SyncAgent

    const BOB_USERNAME = 'bob'
    const BOB_DISPLAY_NAME = 'im_bob'
    let bot: Bot
    let spaceId: string
    let channelId: string
    let botWallet: ethers.Wallet
    let botClientAddress: Address
    let appPrivateDataBase64: string
    let jwtSecretBase64: string
    let appRegistryRpcClient: AppRegistryRpcClient
    let appAddress: Address
    let bobDefaultChannel: Channel

    beforeAll(async () => {
        await shouldInitializeBotOwner()
        await shouldMintBot()
        await shouldInstallBotInSpace()
        await shouldRegisterBotInAppRegistry()
        await shouldRunBotServerAndRegisterWebhook()
    })

    const setForwardSetting = async (forwardSetting: ForwardSettingValue) => {
        await appRegistryRpcClient.setAppSettings({
            appId: bin_fromHexString(botClientAddress),
            settings: { forwardSetting },
        })
    }

    const shouldInitializeBotOwner = async () => {
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
        bobDefaultChannel = bobClient.spaces.getSpace(spaceId).getChannel(channelId)
        await bobDefaultChannel.members.myself.setUsername(BOB_USERNAME)
        await bobDefaultChannel.members.myself.setDisplayName(BOB_DISPLAY_NAME)
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()
    }

    const shouldMintBot = async () => {
        botWallet = ethers.Wallet.createRandom()
        botClientAddress = botWallet.address as Address

        const tx = await appRegistryDapp.createApp(
            bob.signer,
            'bot-witness-of-infinity',
            [...Object.values(Permission)], // all permissions
            botClientAddress,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt = await tx.wait()
        const { app: address } = appRegistryDapp.getCreateAppEvent(receipt)
        expect(address).toBeDefined()
        appAddress = address as Address
    }

    const shouldInstallBotInSpace = async () => {
        const space = spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error('Space not found')
        }

        // this adds the bot to the space (onchain)
        const tx = await appRegistryDapp.installApp(
            bob.signer,
            appAddress,
            SpaceAddressFromSpaceId(spaceId) as Address,
            ethers.utils.parseEther('0.02').toBigInt(), // sending more to cover protocol fee
        )
        const receipt = await tx.wait()
        expect(receipt.status).toBe(1)
        const installedApps = await space.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(appAddress)

        const delegateWallet = ethers.Wallet.createRandom()
        const signerContext = await makeSignerContext(botWallet, delegateWallet)
        const rpcClient = await makeRiverRpcClient(
            makeRiverProvider(riverConfig),
            riverConfig.river.chainConfig,
        )
        const cryptoStore = RiverDbManager.getCryptoDb(appAddress)
        const botClient = new Client(
            signerContext,
            rpcClient,
            cryptoStore,
            new MockEntitlementsDelegate(),
        )
        await expect(botClient.initializeUser({ appAddress })).resolves.toBeDefined()

        await bobClient.riverConnection.call((client) => client.joinUser(spaceId, botClient.userId))
        await bobClient.riverConnection.call((client) =>
            client.joinUser(channelId, botClient.userId),
        )
        const addResult = await botClient.uploadDeviceKeys()
        expect(addResult).toBeDefined()
        expect(addResult.error).toBeUndefined()

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
    }

    const shouldRegisterBotInAppRegistry = async () => {
        const { appRegistryRpcClient: rpcClient } = await AppRegistryService.authenticateWithSigner(
            bob.userId,
            bob.signer,
            getAppRegistryUrl(process.env.RIVER_ENV!),
        )
        appRegistryRpcClient = rpcClient
        const { hs256SharedSecret } = await appRegistryRpcClient.register({
            appId: bin_fromHexString(botClientAddress),
            appOwnerId: bin_fromHexString(bob.userId),
        })
        jwtSecretBase64 = bin_toBase64(hs256SharedSecret)
        expect(jwtSecretBase64).toBeDefined()
    }

    const shouldRunBotServerAndRegisterWebhook = async () => {
        bot = await makeTownsBot(appPrivateDataBase64, jwtSecretBase64, process.env.RIVER_ENV)
        expect(bot).toBeDefined()
        expect(bot.botId).toBe(botClientAddress)
        const { jwtMiddleware, handler } = await bot.start()
        const app = new Hono()
        app.use(jwtMiddleware)
        app.post('/webhook', handler)
        serve({
            port: Number(process.env.BOT_PORT!),
            fetch: app.fetch,
            createServer,
        })
        await appRegistryRpcClient.registerWebhook({
            appId: bin_fromHexString(botClientAddress),
            webhookUrl: WEBHOOK_URL,
        })

        const { isRegistered, validResponse } = await appRegistryRpcClient.getStatus({
            appId: bin_fromHexString(botClientAddress),
        })
        expect(isRegistered).toBe(true)
        expect(validResponse).toBe(true)
    }

    it('should receive a message forwarded', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        let receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })
        const TEST_MESSAGE = 'Hello bot!'

        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE)

        await waitFor(() => receivedMessages.length > 0, { timeoutMS: 15_000 })
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.message).toBe(TEST_MESSAGE)
        expect(event?.isDm).toBe(false)
        expect(event?.isGdm).toBe(false)
        receivedMessages = []
    })

    it('should not receive messages when forwarding is set to no messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_NO_MESSAGES)

        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })

        const TEST_MESSAGE = 'This message should not be forwarded'
        await bobDefaultChannel.sendMessage(TEST_MESSAGE)

        await new Promise((resolve) => setTimeout(resolve, 2500))
        expect(receivedMessages).toHaveLength(0)
    })

    it('should receive channel join event when carol joins the channel if bot is listening to channel join events', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedChannelJoinEvents: OnChannelJoin[] = []
        bot.onChannelJoin((_h, e) => {
            receivedChannelJoinEvents.push(e)
        })
        await aliceClient.spaces.joinSpace(spaceId, alice.signer)
        await waitFor(() => receivedChannelJoinEvents.length > 0)
        expect(receivedChannelJoinEvents.find((x) => x.userId === alice.userId)).toBeDefined()
    })

    // TODO: re-enable the following two tests when the app registry contract behavior is verified
    // and it is deployed on all environments, so we can re-enable the app registry contract check
    // on GDM/DM creation.
    it.skip('SHOULD NOT receive dm messages', { fails: true }, async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })
        const TEST_MESSAGE = 'hii bot'

        const { streamId } = await bobClient.dms.createDM(bot.botId)
        const dm = bobClient.dms.getDm(streamId)
        const { eventId } = await dm.sendMessage(TEST_MESSAGE)
        await waitFor(() => expect(receivedMessages.length).toBeGreaterThan(0))
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.isDm).toBe(true)
        expect(event?.isGdm).toBe(false)
        expect(event?.message).toBe(TEST_MESSAGE)
    })

    it.skip('SHOULD NOT receive gdm messages', { fails: true }, async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })
        const TEST_MESSAGE = 'hii bot'

        const { streamId } = await bobClient.gdms.createGDM([alice.userId, bot.botId])
        const gdm = bobClient.gdms.getGdm(streamId)
        const { eventId } = await gdm.sendMessage(TEST_MESSAGE)
        await waitFor(() => expect(receivedMessages.length).toBeGreaterThan(0))
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.isGdm).toBe(true)
        expect(event?.isDm).toBe(false)
        expect(event?.message).toBe(TEST_MESSAGE)
    })

    // TODO: not planned for now
    it.skip('should be able to get user data', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const userData: UserData[] = []
        bot.onMessage(async (h, e) => {
            const data = await h.getUserData(e.channelId, e.userId)
            if (data) {
                userData.push(data)
            }
        })
        const vitalikEnsAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
        const azukiNft = {
            chainId: 1,
            contractAddress: '0xed5af388653567af2f388e6224dc7c4b3241c544',
            tokenId: '3280',
        }
        await bobDefaultChannel.members.myself.setEnsAddress(vitalikEnsAddress)
        await bobDefaultChannel.members.myself.setNft(azukiNft)

        await bobDefaultChannel.sendMessage('Hello')
        await waitFor(() => userData.length > 0)
        const data = userData.find((x) => x.userId === bob.userId)
        expect(data?.displayName).toBe(BOB_DISPLAY_NAME)
        expect(data?.username).toBe(BOB_USERNAME)
        expect(data?.ensAddress?.toLowerCase()).toBe(vitalikEnsAddress.toLowerCase())
        expect(data?.userId).toBe(bob.userId)
        expect(data?.nft).toEqual(azukiNft)
    })

    it('onMessageEdit should be triggered when a message is edited', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedEditEvents: OnMessageEditType[] = []
        bot.onMessageEdit((_h, e) => {
            receivedEditEvents.push(e)
        })

        const originalMessage = 'Original message to delete'
        const editedMessage = 'Edited message content'
        const { eventId: originalMessageId } = await bobDefaultChannel.sendMessage(originalMessage)
        await bobDefaultChannel.editMessage(originalMessageId, editedMessage)

        await waitFor(() => receivedEditEvents.length > 0)

        const editEvent = receivedEditEvents.find((e) => e.refEventId === originalMessageId)
        expect(editEvent).toBeDefined()
        expect(editEvent?.message).toBe(editedMessage)
    })

    it('onThreadMessage should be triggered when a message is sent in a thread', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedThreadMessages: OnThreadMessageType[] = []
        bot.onThreadMessage((_h, e) => {
            receivedThreadMessages.push(e)
        })

        const initialMessage = 'Starting a thread'
        const threadReply = 'Replying in thread'
        const { eventId: initialMessageId } = await bobDefaultChannel.sendMessage(initialMessage)
        const { eventId: replyEventId } = await bobDefaultChannel.sendMessage(threadReply, {
            threadId: initialMessageId,
        })

        await waitFor(() => receivedThreadMessages.length > 0)

        const threadEvent = receivedThreadMessages.find((e) => e.eventId === replyEventId)
        expect(threadEvent).toBeDefined()
        expect(threadEvent?.message).toBe(threadReply)
        expect(threadEvent?.userId).toBe(bob.userId)
        expect(threadEvent?.threadId).toBe(initialMessageId)
    })

    it('onMentioned should be triggered when a bot is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'Hello @bot'
        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE, {
            mentions: [
                {
                    userId: bot.botId,
                    displayName: bot.botId,
                    mentionBehavior: { case: undefined, value: undefined },
                },
            ],
        })
        await waitFor(() => receivedMentionedEvents.length > 0)
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeDefined()
    })

    it('onMentioned should NOT BE triggered when someone else is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'Hello @alice'
        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE, {
            mentions: [
                {
                    userId: alice.userId,
                    displayName: 'alice',
                    mentionBehavior: { case: undefined, value: undefined },
                },
            ],
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })

    it('onReaction should be triggered when a reaction is added', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedReactionEvents: BotPayload<'reaction'>[] = []
        bot.onReaction((_h, e) => {
            receivedReactionEvents.push(e)
        })

        const { eventId: messageId } = await bobClient.spaces
            .getSpace(spaceId)
            .getChannel(channelId)
            .sendMessage('Hello')
        const { eventId: reactionId } = await bobDefaultChannel.sendReaction(messageId, '👍')
        await waitFor(() => receivedReactionEvents.length > 0)
        expect(receivedReactionEvents.find((x) => x.eventId === reactionId)).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.reaction === '👍')).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.messageId === messageId)).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.userId === bob.userId)).toBeDefined()
    })

    it('onRedaction should be triggered when a message is redacted', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedRedactionEvents: BotPayload<'redaction'>[] = []
        bot.onRedaction((_h, e) => {
            receivedRedactionEvents.push(e)
        })
        const { eventId: messageId } = await bobDefaultChannel.sendMessage('Hello')
        const { eventId: redactionId } = await bobDefaultChannel.redact(messageId)
        await waitFor(() => receivedRedactionEvents.length > 0)
        expect(receivedRedactionEvents.find((x) => x.eventId === redactionId)).toBeDefined()
    })

    // TODO: flaky test
    it.skip('onReply should be triggered when a message is replied to', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
        const receivedReplyEvents: BotPayload<'reply'>[] = []
        bot.onReply((_h, e) => {
            receivedReplyEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        const { eventId: replyEventId } = await bobDefaultChannel.sendMessage('hi back', {
            replyId: messageId,
        })
        await waitFor(() => receivedReplyEvents.length > 0)
        expect(receivedReplyEvents.find((x) => x.eventId === replyEventId)).toBeDefined()
    })

    // TODO: I couldnt get onTip to work somehow
    // ConnectError: [failed_precondition] AddEvent: (62:DOWNSTREAM_NETWORK_ERROR)
    // <base 0: unavailable: AddEvent: (14:UNAVAILABLE) Forwarding disabled by request header
    // nodeAddress = 0x9CfBCA75Bc64E67Ff415C60367A78DC110BC9239
    // nodeUrl =
    // handler = AddEvent
    // elapsed = 8.350417ms
    // streamId = a898546bf3b74bb84457ead94fc0d89e64b837c7740000000000000000000000
    // >>base 0 end
    // nodeAddress = 0xC0C4e900678EcA2d9C17d7771351BDf7a225Ca1d
    // nodeUrl =
    // handler = AddEvent
    // elapsed = 9.889292ms
    // streamId = a898546bf3b74bb84457ead94fc0d89e64b837c7740000000000000000000000
    it.skip('onTip should be triggered wfhen a tip is received', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedTipEvents: BotPayload<'tip'>[] = []
        bot.onTip((_h, e) => {
            receivedTipEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        await bobDefaultChannel.sendTip(
            messageId,
            {
                amount: ethers.utils.parseUnits('0.1').toBigInt(),
                currency: ETH_ADDRESS,
                chainId: 1,
                receiver: bot.botId,
            },
            bob.signer,
        )
        await waitFor(() => receivedTipEvents.length > 0)
        expect(receivedTipEvents.find((x) => x.eventId === messageId)).toBeDefined()
    })

    it('onEventRevoke (FORWARD_SETTING_ALL_MESSAGES) should be triggered when a message is revoked', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedEventRevokeEvents: BotPayload<'eventRevoke'>[] = []
        bot.onEventRevoke((_h, e) => {
            receivedEventRevokeEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        await bobDefaultChannel.adminRedact(messageId)
        await waitFor(() => receivedEventRevokeEvents.length > 0)
        expect(receivedEventRevokeEvents.find((x) => x.refEventId === messageId)).toBeDefined()
    })

    it.fails(
        'onEventRevoke (FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS) should be triggered when a message that mentions the bot is revoked',
        async () => {
            await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
            const receivedEventRevokeEvents: BotPayload<'eventRevoke'>[] = []
            bot.onEventRevoke((_h, e) => {
                receivedEventRevokeEvents.push(e)
            })
            const { eventId: messageId } = await bobDefaultChannel.sendMessage('hii @bot', {
                mentions: [
                    {
                        userId: bot.botId,
                        displayName: bot.botId,
                        mentionBehavior: { case: undefined, value: undefined },
                    },
                ],
            })
            await bobDefaultChannel.adminRedact(messageId)
            await waitFor(() => receivedEventRevokeEvents.length > 0)
            expect(receivedEventRevokeEvents.find((x) => x.refEventId === messageId)).toBeDefined()
        },
    )

    it('never receive message from a uninstalled app', async () => {
        await appRegistryDapp.uninstallApp(
            bob.signer,
            appAddress,
            SpaceAddressFromSpaceId(spaceId) as Address,
        )
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'wont be received'
        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE)
        await expect(waitFor(() => receivedMentionedEvents.length > 0)).rejects.toThrow()
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })
})
