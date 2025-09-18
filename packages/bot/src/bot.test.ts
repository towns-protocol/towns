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
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/utils'
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

    const carol = new SyncAgentTest(undefined, riverConfig)
    let carolClient: SyncAgent

    const BOB_USERNAME = 'bob'
    const BOB_DISPLAY_NAME = 'im_bob'

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
    let bobDefaultChannel: Channel
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
        await Promise.all([bob.fundWallet(), alice.fundWallet(), carol.fundWallet()])
        bobClient = await bob.makeSyncAgent()
        aliceClient = await alice.makeSyncAgent()
        carolClient = await carol.makeSyncAgent()
        await Promise.all([bobClient.start(), aliceClient.start(), carolClient.start()])
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
        botWallet = ethers.Wallet.createRandom().connect(ethersProvider)
        botClientAddress = botWallet.address as Address
        const fundingTx = await bob.signer.sendTransaction({
            to: botClientAddress,
            value: ethers.utils.parseEther('0.5'),
        })
        await fundingTx.wait()

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
        const streamView = await bobClient.riverConnection.call(async (client) => {
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

        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE)

        await waitFor(() => receivedMessages.length > 0, { timeoutMS: 15_000 })
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.message).toBe(TEST_MESSAGE)
        expect(event?.createdAt).toBeDefined()
        expect(event?.createdAt).toBeInstanceOf(Date)
        expect(event?.createdAt.getTime()).toBeGreaterThanOrEqual(timeBeforeSendMessage)
        receivedMessages = []
    })

    it('should check if bob is admin and has read/write permissions', async () => {
        const isBobAdmin = await bot.hasAdminPermission(bob.userId, spaceId)
        const bobCanRead = await bot.checkPermission(spaceId, bob.userId, Permission.Read)
        const bobCanWrite = await bot.checkPermission(spaceId, bob.userId, Permission.Write)
        expect(isBobAdmin).toBe(true)
        expect(bobCanRead).toBe(true)
        expect(bobCanWrite).toBe(true)
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
        await bobDefaultChannel.sendMessage(TEST_MESSAGE)

        await new Promise((resolve) => setTimeout(resolve, 2500))
        expect(receivedMessages).toHaveLength(0)
    })

    it('should receive channel join event when alice joins the channel if bot is listening to channel join events', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedChannelJoinEvents: OnChannelJoin[] = []
        bot.onChannelJoin((_h, e) => {
            receivedChannelJoinEvents.push(e)
        })
        await aliceClient.spaces.joinSpace(spaceId, alice.signer)
        await waitFor(() => receivedChannelJoinEvents.length > 0)
        expect(receivedChannelJoinEvents.find((x) => x.userId === alice.userId)).toBeDefined()
    })

    it('should receive slash command messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        bot.onSlashCommand('help', (_h, e) => {
            receivedMessages.push(e)
        })
        const { eventId } = await bobDefaultChannel.sendMessage('/help', {
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
        const { eventId: threadId } = await bobDefaultChannel.sendMessage('starting a thread')
        const { eventId } = await bobDefaultChannel.sendMessage('/help', {
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
        const { eventId: replyId } = await bobDefaultChannel.sendMessage('yo')
        const { eventId } = await bobDefaultChannel.sendMessage('/help', {
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
        const { eventId } = await bobDefaultChannel.sendMessage('/status detailed info', {
            appClientAddress: bot.botId,
        })
        await waitFor(() => receivedMessages.length > 0)
        const event = receivedMessages.find((x) => x.eventId === eventId)
        expect(event?.command).toBe('status')
        expect(event?.args).toStrictEqual(['detailed', 'info'])
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

    it('onMessage should be triggered with threadId when a message is sent in a thread', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedThreadMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            if (e.threadId) {
                receivedThreadMessages.push(e)
            }
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

    it('onMessage should be triggered with isMentioned when a bot is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            if (e.isMentioned) {
                receivedMentionedEvents.push(e)
            }
        })
        const TEST_MESSAGE = 'Hello @bot'
        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE, {
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
        expect(mentionedEvent?.isMentioned).toBe(true)
        expect(mentionedEvent?.mentions[0].userId).toBe(bot.botId)
        expect(mentionedEvent?.mentions[0].displayName).toBe(BOT_DISPLAY_NAME)
    })

    it('isMentioned should be false when someone else is mentioned', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
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
        await waitFor(() => receivedMessages.length > 0)
        const message = receivedMessages.find((x) => x.eventId === eventId)
        expect(message).toBeDefined()
        expect(message?.isMentioned).toBe(false)
    })

    it('onMessage should be triggered with both threadId and isMentioned when bot is mentioned in a thread', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedInThreadEvents: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMentionedInThreadEvents.push(e)
        })

        const { eventId: initialMessageId } =
            await bobDefaultChannel.sendMessage('starting a thread')
        const { eventId: threadMentionEventId } = await bobDefaultChannel.sendMessage(
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
        expect(threadMentionEvent?.userId).toBe(bob.userId)
        expect(threadMentionEvent?.threadId).toBe(initialMessageId)
        expect(threadMentionEvent?.isMentioned).toBe(true)
    })

    it('thread message without bot mention should have isMentioned false', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMessages.push(e)
        })

        const initialMessage = 'Starting another thread'
        const threadMessageWithoutMention = 'Thread message without mention'
        const { eventId: initialMessageId } = await bobDefaultChannel.sendMessage(initialMessage)
        const { eventId: threadEventId } = await bobDefaultChannel.sendMessage(
            threadMessageWithoutMention,
            {
                threadId: initialMessageId,
            },
        )

        await waitFor(() => receivedMessages.length > 0)
        const message = receivedMessages.find((x) => x.eventId === threadEventId)
        expect(message).toBeDefined()
        expect(message?.threadId).toBe(initialMessageId)
        expect(message?.isMentioned).toBe(false)
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

    it('bot can redact his own message', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'Hello')
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        const { eventId: redactionId } = await bot.removeEvent(channelId, messageId)
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === redactionId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactionActionEvent),
        )
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactedEvent),
        )
    })

    it('bot can ban and unban users', async () => {
        // Carol joins the space first
        await carolClient.spaces.joinSpace(spaceId, carol.signer)
        // Carol should not be banned initially
        let isBanned = await spaceDapp.walletAddressIsBanned(spaceId, carol.userId)
        expect(isBanned).toBe(false)
        // Ban carol
        const { txHash: banTxHash } = await bot.ban(carol.userId, spaceId)
        expect(banTxHash).toBeTruthy()
        isBanned = await spaceDapp.walletAddressIsBanned(spaceId, carol.userId, { skipCache: true })
        expect(isBanned).toBe(true)
        // Unban carol
        const { txHash: unbanTxHash } = await bot.unban(carol.userId, spaceId)
        expect(unbanTxHash).toBeTruthy()
        // Verify carol is unbanned
        isBanned = await spaceDapp.walletAddressIsBanned(spaceId, carol.userId, { skipCache: true })
        expect(isBanned).toBe(false)
    })

    it('bot can redact other people messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const messages: BotPayload<'message'>[] = []
        bot.onMessage((_h, e) => {
            messages.push(e)
        })
        const { eventId: bobMessageId } = await bobDefaultChannel.sendMessage('Hello')
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === bobMessageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        await waitFor(() => messages.length > 0)
        const { eventId: redactionId } = await bot.adminRemoveEvent(channelId, bobMessageId)
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === redactionId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactionActionEvent),
        )
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === bobMessageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.RedactedEvent),
        )
    })
    it.skip('onMessage should be triggered with replyId when a message is replied to', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
        const receivedReplyEvents: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedReplyEvents.push(e)
        })
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId),
            ).toBeDefined(),
        )
        const { eventId: replyEventId } = await bobDefaultChannel.sendMessage('hi back', {
            replyId: messageId,
        })
        await waitFor(() => receivedReplyEvents.length > 0)
        const replyEvent = receivedReplyEvents.find((x) => x.eventId === replyEventId)
        expect(replyEvent).toBeDefined()
        expect(replyEvent?.replyId).toBe(messageId)
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
        // bob tips the bot
        await bobDefaultChannel.sendTip(
            messageId,
            {
                amount: ethers.utils.parseUnits('0.01').toBigInt(),
                currency: ETH_ADDRESS,
                chainId: riverConfig.base.chainConfig.chainId,
                receiver: bot.botId, // Use bot.botId which is the bot's userId that has the membership token
            },
            bob.signer,
        )
        // app address is the address of the bot contract (not the bot client, since client is per installation)
        const balance = (await ethersProvider.getBalance(appAddress)).toBigInt()
        // Due to protocol fee, the balance should be greater than the balance before, but its not exactly + 0.01
        expect(balance).toBeGreaterThan(balanceBefore)
        await waitFor(() => receivedTipEvents.length > 0)
        const tipEvent = receivedTipEvents.find((x) => x.messageId === messageId)
        expect(tipEvent).toBeDefined()
        expect(tipEvent?.userId).toBe(bob.userId)
        expect(tipEvent?.spaceId).toBe(spaceId)
        expect(tipEvent?.channelId).toBe(channelId)
        expect(tipEvent?.amount).toBe(ethers.utils.parseUnits('0.01').toBigInt())
        expect(tipEvent?.currency).toBe(ETH_ADDRESS)
        expect(tipEvent?.senderAddress).toBe(bob.userId)
        expect(tipEvent?.receiverAddress).toBe(bot.botId)
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

    // TODO: waiting for disable bot feature
    it.skip('never receive message from a uninstalled app', async () => {
        await appRegistryDapp.uninstallApp(
            bob.signer,
            appAddress,
            SpaceAddressFromSpaceId(spaceId) as Address,
        )
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMentionedEvents: OnMessageType[] = []
        bot.onMessage((_h, e) => {
            receivedMentionedEvents.push(e)
        })
        const TEST_MESSAGE = 'wont be received'
        const { eventId } = await bobDefaultChannel.sendMessage(TEST_MESSAGE)
        await expect(waitFor(() => receivedMentionedEvents.length > 0)).rejects.toThrow()
        expect(receivedMentionedEvents.find((x) => x.eventId === eventId)).toBeUndefined()
    })
})
