import {
    Client,
    makeAppPrivateData,
    makeBaseProvider,
    makeRiverConfig,
    makeRiverProvider,
    makeRiverRpcClient,
    makeSignerContext,
    makeUserStreamId,
    MockEntitlementsDelegate,
    RiverDbManager,
    RiverTimelineEvent,
    waitFor,
    type AppRegistryRpcClient,
    type Channel,
    type SyncAgent,
} from '@towns-protocol/sdk'
import { describe, it, expect, beforeAll } from 'vitest'
import type { Bot, BotPayload } from './bot'
import { Bot as SyncAgentTest, AppRegistryService, getAppRegistryUrl } from '@towns-protocol/sdk'
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/dlog'
import { makeTownsBot } from './bot'
import { ethers } from 'ethers'
import { ForwardSettingValue, type PlainMessage, type SlashCommand } from '@towns-protocol/proto'
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
import { randomUUID } from 'crypto'

const WEBHOOK_URL = `https://localhost:${process.env.BOT_PORT}/webhook`

const SLASH_COMMANDS = [
    { name: 'help', description: 'Get help with bot commands' },
    { name: 'status', description: 'Check bot status' },
] as const satisfies PlainMessage<SlashCommand>[]

type OnMessageType = BotPayload<'message'>
type OnChannelJoin = BotPayload<'channelJoin'>
type OnMessageEditType = BotPayload<'messageEdit'>
type OnThreadMessageType = BotPayload<'threadMessage'>
type OnMentionedType = BotPayload<'mentioned'>
type OnMentionedInThreadType = BotPayload<'mentionedInThread'>
type OnSlashCommandType = BotPayload<'slashCommand', typeof SLASH_COMMANDS>

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

    const BOT_USERNAME = `bot-witness-of-infinity-${randomUUID()}`
    const BOT_DISPLAY_NAME = 'Uber Test Bot'
    const BOT_DESCRIPTION = 'I shall witness everything'

    let bot: Bot<typeof SLASH_COMMANDS>
    let spaceId: string
    let channelId: string
    let botWallet: ethers.Wallet
    let botClientAddress: Address
    let appPrivateData: string
    let jwtSecretBase64: string
    let appRegistryRpcClient: AppRegistryRpcClient
    let appAddress: Address
    let aliceDefaultChannel: Channel
    let ethersProvider: ethers.providers.StaticJsonRpcProvider

    beforeAll(async () => {
        await shouldInitializeBotOwner()
        await shouldMintBot()
        await shouldInstallBotInSpace()
        await shouldRegisterBotInAppRegistry()
        await shouldRunBotServerAndRegisterWebhook()
        ethersProvider = makeBaseProvider(riverConfig)
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
        // Alice creates the space (she's the space owner)
        const { spaceId: spaceId_, defaultChannelId } = await aliceClient.spaces.createSpace(
            { spaceName: 'alices-space' },
            alice.signer,
        )
        spaceId = spaceId_
        channelId = defaultChannelId
        aliceDefaultChannel = aliceClient.spaces.getSpace(spaceId).getChannel(channelId)
        const ALICE_USERNAME = 'alice'
        const ALICE_DISPLAY_NAME = 'im_alice'
        await aliceDefaultChannel.members.myself.setUsername(ALICE_USERNAME)
        await aliceDefaultChannel.members.myself.setDisplayName(ALICE_DISPLAY_NAME)
        expect(spaceId).toBeDefined()
        expect(channelId).toBeDefined()
    }

    const shouldMintBot = async () => {
        botWallet = ethers.Wallet.createRandom()
        botClientAddress = botWallet.address as Address

        const tx = await appRegistryDapp.createApp(
            bob.signer,
            BOT_USERNAME,
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

        // Alice installs Bob's bot to her space (onchain)
        const tx = await appRegistryDapp.installApp(
            alice.signer,
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

        await aliceClient.riverConnection.call((client) =>
            client.joinUser(spaceId, botClient.userId),
        )
        await aliceClient.riverConnection.call((client) =>
            client.joinUser(channelId, botClient.userId),
        )
        const addResult = await botClient.uploadDeviceKeys()
        expect(addResult).toBeDefined()

        const exportedDevice = await botClient.cryptoBackend?.exportDevice()
        expect(exportedDevice).toBeDefined()
        appPrivateData = makeAppPrivateData(
            botWallet.privateKey,
            exportedDevice!,
            process.env.RIVER_ENV!,
        )
        expect(appPrivateData).toBeDefined()
    }

    const shouldRegisterBotInAppRegistry = async () => {
        const appRegistryUrl = getAppRegistryUrl(process.env.RIVER_ENV!)
        const { appRegistryRpcClient: rpcClient } = await AppRegistryService.authenticateWithSigner(
            bob.userId,
            bob.signer,
            appRegistryUrl,
        )
        appRegistryRpcClient = rpcClient
        const { hs256SharedSecret } = await appRegistryRpcClient.register({
            appId: bin_fromHexString(botClientAddress),
            appOwnerId: bin_fromHexString(bob.userId),
            metadata: {
                username: BOT_USERNAME,
                displayName: BOT_DISPLAY_NAME,
                description: BOT_DESCRIPTION,
                avatarUrl: 'https://placehold.co/64x64',
                imageUrl: 'https://placehold.co/600x600',
                slashCommands: SLASH_COMMANDS,
            },
        })
        jwtSecretBase64 = bin_toBase64(hs256SharedSecret)
        expect(jwtSecretBase64).toBeDefined()
    }

    const shouldRunBotServerAndRegisterWebhook = async () => {
        bot = await makeTownsBot(appPrivateData, jwtSecretBase64, { commands: SLASH_COMMANDS })
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

    it('should have app_address defined in user stream for bot', async () => {
        const botUserStreamId = makeUserStreamId(botClientAddress)
        const streamView = await aliceClient.riverConnection.call(async (client) => {
            return await client.getStream(botUserStreamId)
        })
        const userStream = streamView.userContent.userStreamModel
        expect(userStream.appAddress).toBeDefined()
        expect(userStream.appAddress).toBe(appAddress)
    })

    it('should receive a message forwarded', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const timeBeforeSendMessage = Date.now()
        let receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })
        const TEST_MESSAGE = 'Hello bot!'

        const { eventId } = await aliceDefaultChannel.sendMessage(TEST_MESSAGE)

        await waitFor(() => receivedMessages.length > 0, { timeoutMS: 15_000 })
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.message).toBe(TEST_MESSAGE)
        expect(event?.isDm).toBe(false)
        expect(event?.createdAt).toBeDefined()
        expect(event?.createdAt).toBeInstanceOf(Date)
        expect(event?.createdAt.getTime()).toBeGreaterThanOrEqual(timeBeforeSendMessage)
        expect(event?.isGdm).toBe(false)
        receivedMessages = []
    })

    it('should check if alice is admin and has read/write permissions', async () => {
        const isAliceAdmin = await bot.hasAdminPermission(alice.userId, spaceId)
        const aliceCanRead = await bot.checkPermission(spaceId, alice.userId, Permission.Read)
        const aliceCanWrite = await bot.checkPermission(spaceId, alice.userId, Permission.Write)
        expect(isAliceAdmin).toBe(true)
        expect(aliceCanRead).toBe(true)
        expect(aliceCanWrite).toBe(true)
    })

    it('should check if bot has read/write permissions', async () => {
        const botCanRead = await bot.checkPermission(spaceId, bot.botId, Permission.Read)
        const botCanWrite = await bot.checkPermission(spaceId, bot.botId, Permission.Write)
        expect(botCanRead).toBe(true)
        expect(botCanWrite).toBe(true)
    })

    it('should not receive messages when forwarding is set to no messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_NO_MESSAGES)

        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })

        const TEST_MESSAGE = 'This message should not be forwarded'
        await aliceDefaultChannel.sendMessage(TEST_MESSAGE)

        await new Promise((resolve) => setTimeout(resolve, 2500))
        expect(receivedMessages).toHaveLength(0)
    })

    it('should receive channel join event when bob joins the channel if bot is listening to channel join events', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedChannelJoinEvents: OnChannelJoin[] = []
        bot.onChannelJoin((_h, e) => {
            receivedChannelJoinEvents.push(e)
        })
        await bobClient.spaces.joinSpace(spaceId, bob.signer)
        await waitFor(() => receivedChannelJoinEvents.length > 0)
        expect(receivedChannelJoinEvents.find((x) => x.userId === bob.userId)).toBeDefined()
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

        const { streamId } = await aliceClient.dms.createDM(bot.botId)
        const dm = aliceClient.dms.getDm(streamId)
        const { eventId } = await dm.sendMessage(TEST_MESSAGE)
        await waitFor(() => expect(receivedMessages.length).toBeGreaterThan(0))
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.isDm).toBe(true)
        expect(event?.isGdm).toBe(false)
        expect(event?.message).toBe(TEST_MESSAGE)
    })

    it('should receive slash command messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        bot.onSlashCommand('help', (_h, e) => {
            receivedMessages.push(e)
        })
        const { eventId } = await aliceDefaultChannel.sendMessage('/help', {
            appClientAddress: bot.botId,
        })
        await waitFor(() => receivedMessages.length > 0)
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.command).toBe('help')
        expect(event?.args).toStrictEqual([])
    })

    it('should receive slash command in a thread', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        bot.onSlashCommand('help', (_h, e) => {
            receivedMessages.push(e)
        })
        const { eventId: threadId } = await aliceDefaultChannel.sendMessage('starting a thread')
        const { eventId } = await aliceDefaultChannel.sendMessage('/help', {
            appClientAddress: bot.botId,
            threadId: threadId,
        })
        await waitFor(() => receivedMessages.length > 0)
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.command).toBe('help')
        expect(event?.args).toStrictEqual([])
        expect(event?.threadId).toBe(threadId)
    })

    it('should receive slash command as a reply', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        bot.onSlashCommand('help', (_h, e) => {
            receivedMessages.push(e)
        })
        const { eventId: replyId } = await aliceDefaultChannel.sendMessage('yo')
        const { eventId } = await aliceDefaultChannel.sendMessage('/help', {
            appClientAddress: bot.botId,
            replyId: replyId,
        })
        await waitFor(() => receivedMessages.length > 0)
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.command).toBe('help')
        expect(event?.args).toStrictEqual([])
        expect(event?.replyId).toBe(replyId)
    })

    it('should receive slash command with arguments', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        bot.onSlashCommand('status', (_h, e) => {
            receivedMessages.push(e)
        })
        const { eventId } = await aliceDefaultChannel.sendMessage('/status detailed info', {
            appClientAddress: bot.botId,
        })
        await waitFor(() => receivedMessages.length > 0)
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.command).toBe('status')
        expect(event?.args).toStrictEqual(['detailed', 'info'])
    })

    it.skip('SHOULD NOT receive gdm messages', { fails: true }, async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })
        const TEST_MESSAGE = 'hii bot'

        const { streamId } = await aliceClient.gdms.createGDM([bob.userId, bot.botId])
        const gdm = aliceClient.gdms.getGdm(streamId)
        const { eventId } = await gdm.sendMessage(TEST_MESSAGE)
        await waitFor(() => expect(receivedMessages.length).toBeGreaterThan(0))
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.isGdm).toBe(true)
        expect(event?.isDm).toBe(false)
        expect(event?.message).toBe(TEST_MESSAGE)
    })

    it('onMessageEdit should be triggered when a message is edited', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedEditEvents: OnMessageEditType[] = []
        bot.onMessageEdit((_h, e) => {
            receivedEditEvents.push(e)
        })

        const originalMessage = 'Original message to delete'
        const editedMessage = 'Edited message content'
        const { eventId: originalMessageId } =
            await aliceDefaultChannel.sendMessage(originalMessage)
        await aliceDefaultChannel.editMessage(originalMessageId, editedMessage)

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
        const { eventId: initialMessageId } = await aliceDefaultChannel.sendMessage(initialMessage)
        const { eventId: replyEventId } = await aliceDefaultChannel.sendMessage(threadReply, {
            threadId: initialMessageId,
        })

        await waitFor(() => receivedThreadMessages.length > 0)

        const threadEvent = receivedThreadMessages.find((e) => e.eventId === replyEventId)
        expect(threadEvent).toBeDefined()
        expect(threadEvent?.message).toBe(threadReply)
        expect(threadEvent?.userId).toBe(alice.userId)
        expect(threadEvent?.threadId).toBe(initialMessageId)
    })

    it('onMentioned should be triggered when a bot is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'Hello @bot'
        const { eventId } = await aliceDefaultChannel.sendMessage(TEST_MESSAGE, {
            mentions: [
                {
                    userId: bot.botId,
                    displayName: BOT_DISPLAY_NAME,
                    mentionBehavior: { case: undefined, value: undefined },
                },
            ],
        })
        await waitFor(() => receivedMentionedEvents.length > 0)
        const mentionedEvent = receivedMentionedEvents.find((x) => x.eventId === eventId)
        expect(mentionedEvent).toBeDefined()
        expect(mentionedEvent?.mentions[0].userId).toBe(bot.botId)
        expect(mentionedEvent?.mentions[0].displayName).toBe(BOT_DISPLAY_NAME)
    })

    it('onMentioned should NOT BE triggered when someone else is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'Hello @bob'
        const { eventId } = await aliceDefaultChannel.sendMessage(TEST_MESSAGE, {
            mentions: [
                {
                    userId: bob.userId,
                    displayName: 'bob',
                    mentionBehavior: { case: undefined, value: undefined },
                },
            ],
        })
        await new Promise((resolve) => setTimeout(resolve, 1000))
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })

    it('onMentionedInThread should be triggered when bot is mentioned in a thread', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedInThreadEvents: OnMentionedInThreadType[] = []
        bot.onMentionedInThread((_h, e) => {
            receivedMentionedInThreadEvents.push(e)
        })

        const { eventId: initialMessageId } =
            await aliceDefaultChannel.sendMessage('starting a thread')
        const { eventId: threadMentionEventId } = await aliceDefaultChannel.sendMessage(
            'yo @bot check this thread',
            {
                threadId: initialMessageId,
                mentions: [
                    {
                        userId: bot.botId,
                        displayName: bot.botId,
                        mentionBehavior: { case: undefined, value: undefined },
                    },
                ],
            },
        )

        await waitFor(() => receivedMentionedInThreadEvents.length > 0)

        const threadMentionEvent = receivedMentionedInThreadEvents.find(
            (e) => e.eventId === threadMentionEventId,
        )
        expect(threadMentionEvent).toBeDefined()
        expect(threadMentionEvent?.userId).toBe(alice.userId)
        expect(threadMentionEvent?.threadId).toBe(initialMessageId)
    })

    it('onMentionedInThread should NOT be triggered for regular mentions outside threads', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedInThreadEvents: OnMentionedInThreadType[] = []
        bot.onMentionedInThread((_h, e) => {
            receivedMentionedInThreadEvents.push(e)
        })

        const regularMentionMessage = 'Mentioning @bot outside thread'
        const { eventId } = await aliceDefaultChannel.sendMessage(regularMentionMessage, {
            mentions: [
                {
                    userId: bot.botId,
                    displayName: bot.botId,
                    mentionBehavior: { case: undefined, value: undefined },
                },
            ],
        })

        await new Promise((resolve) => setTimeout(resolve, 1000))
        expect(receivedMentionedInThreadEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })

    it('onMentionedInThread should NOT be triggered for thread messages without bot mentions', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedInThreadEvents: OnMentionedInThreadType[] = []
        bot.onMentionedInThread((_h, e) => {
            receivedMentionedInThreadEvents.push(e)
        })

        const initialMessage = 'Starting another thread'
        const threadMessageWithoutMention = 'Thread message without mention'
        const { eventId: initialMessageId } = await aliceDefaultChannel.sendMessage(initialMessage)
        const { eventId: threadEventId } = await aliceDefaultChannel.sendMessage(
            threadMessageWithoutMention,
            {
                threadId: initialMessageId,
            },
        )

        await new Promise((resolve) => setTimeout(resolve, 1000))
        expect(
            receivedMentionedInThreadEvents.find((x) => x.eventId === threadEventId),
        ).toBeUndefined()
    })

    it('onReaction should be triggered when a reaction is added', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedReactionEvents: BotPayload<'reaction'>[] = []
        bot.onReaction((_h, e) => {
            receivedReactionEvents.push(e)
        })

        const { eventId: messageId } = await aliceClient.spaces
            .getSpace(spaceId)
            .getChannel(channelId)
            .sendMessage('Hello')
        const { eventId: reactionId } = await aliceDefaultChannel.sendReaction(messageId, '👍')
        await waitFor(() => receivedReactionEvents.length > 0)
        expect(receivedReactionEvents.find((x) => x.eventId === reactionId)).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.reaction === '👍')).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.messageId === messageId)).toBeDefined()
        expect(receivedReactionEvents.find((x) => x.userId === alice.userId)).toBeDefined()
    })

    it('onRedaction should be triggered when a message is redacted', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedRedactionEvents: BotPayload<'redaction'>[] = []
        bot.onRedaction((_h, e) => {
            receivedRedactionEvents.push(e)
        })
        const { eventId: messageId } = await aliceDefaultChannel.sendMessage('Hello')
        const { eventId: redactionId } = await aliceDefaultChannel.redact(messageId)
        await waitFor(() => receivedRedactionEvents.length > 0)
        expect(receivedRedactionEvents.find((x) => x.eventId === redactionId)).toBeDefined()
    })

    it('bot can redact his own message', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'Hello')
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        const { eventId: redactionId } = await bot.removeEvent(channelId, messageId)
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === redactionId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactionActionEvent),
        )
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactedEvent),
        )
    })

    it('bot can redact other people messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const messages: BotPayload<'message'>[] = []
        bot.onMessage((_h, e) => {
            messages.push(e)
        })
        const { eventId: aliceMessageId } = await aliceDefaultChannel.sendMessage('Hello')
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === aliceMessageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        await waitFor(() => messages.length > 0)
        const { eventId: redactionId } = await bot.adminRemoveEvent(channelId, aliceMessageId)
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === redactionId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactionActionEvent),
        )
        await waitFor(() =>
            expect(
                aliceDefaultChannel.timeline.events.value.find((x) => x.eventId === aliceMessageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactedEvent),
        )
    })
    // TODO: flaky test
    it.skip('onReply should be triggered when a message is replied to', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
        const receivedReplyEvents: BotPayload<'reply'>[] = []
        bot.onReply((_h, e) => {
            receivedReplyEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        const { eventId: replyEventId } = await aliceDefaultChannel.sendMessage('hi back', {
            replyId: messageId,
        })
        await waitFor(() => receivedReplyEvents.length > 0)
        expect(receivedReplyEvents.find((x) => x.eventId === replyEventId)).toBeDefined()
    })

    it('onTip should be triggered when a tip is received', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedTipEvents: BotPayload<'tip'>[] = []
        bot.onTip((_h, e) => {
            receivedTipEvents.push(e)
        })

        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')

        const balanceBefore = (await ethersProvider.getBalance(appAddress)).toBigInt()
        // alice tips the bot
        await aliceDefaultChannel.sendTip(
            messageId,
            {
                amount: ethers.utils.parseUnits('0.01').toBigInt(),
                currency: ETH_ADDRESS,
                chainId: riverConfig.base.chainConfig.chainId,
                receiver: bot.botId, // Use bot.botId which is the bot's userId that has the membership token
            },
            alice.signer,
        )
        // app address is the address of the bot contract (not the bot client, since client is per installation)
        const balance = (await ethersProvider.getBalance(appAddress)).toBigInt()
        // Due to protocol fee, the balance should be greater than the balance before, but its not exactly + 0.01
        expect(balance).toBeGreaterThan(balanceBefore)
        await waitFor(() => receivedTipEvents.length > 0)
        const tipEvent = receivedTipEvents.find((x) => x.messageId === messageId)
        expect(tipEvent).toBeDefined()
        expect(tipEvent?.userId).toBe(alice.userId)
        expect(tipEvent?.spaceId).toBe(spaceId)
        expect(tipEvent?.channelId).toBe(channelId)
        expect(tipEvent?.amount).toBe(ethers.utils.parseUnits('0.01').toBigInt())
        expect(tipEvent?.currency).toBe(ETH_ADDRESS)
        expect(tipEvent?.senderAddress).toBe(alice.userId)
        expect(tipEvent?.receiverAddress).toBe(bot.botId)
    })

    it('onEventRevoke (FORWARD_SETTING_ALL_MESSAGES) should be triggered when a message is revoked', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedEventRevokeEvents: BotPayload<'eventRevoke'>[] = []
        bot.onEventRevoke((_h, e) => {
            receivedEventRevokeEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        await aliceDefaultChannel.adminRedact(messageId)
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
            const { eventId: messageId } = await aliceDefaultChannel.sendMessage('hii @bot', {
                mentions: [
                    {
                        userId: bot.botId,
                        displayName: bot.botId,
                        mentionBehavior: { case: undefined, value: undefined },
                    },
                ],
            })
            await aliceDefaultChannel.adminRedact(messageId)
            await waitFor(() => receivedEventRevokeEvents.length > 0)
            expect(receivedEventRevokeEvents.find((x) => x.refEventId === messageId)).toBeDefined()
        },
    )

    it('never receive message from a uninstalled app', async () => {
        await appRegistryDapp.uninstallApp(
            alice.signer,
            appAddress,
            SpaceAddressFromSpaceId(spaceId) as Address,
        )
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMentionedType[] = []
        bot.onMentioned((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'wont be received'
        const { eventId } = await aliceDefaultChannel.sendMessage(TEST_MESSAGE)
        await expect(waitFor(() => receivedMentionedEvents.length > 0)).rejects.toThrow()
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })
})
