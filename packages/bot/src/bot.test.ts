import {
    Client,
    makeAppPrivateData,
    makeBaseProvider,
    makeRiverProvider,
    makeRiverRpcClient,
    makeSignerContext,
    makeUserStreamId,
    townsEnv,
    MockEntitlementsDelegate,
    RiverDbManager,
    RiverTimelineEvent,
    waitFor,
    type AppRegistryRpcClient,
    type Channel,
    type SyncAgent,
    Bot as SyncAgentTest,
    AppRegistryService,
    MessageType,
} from '@towns-protocol/sdk'
import { describe, it, expect, beforeAll } from 'vitest'
import type { Bot, BotPayload } from './bot'
import { bin_fromHexString, bin_toBase64 } from '@towns-protocol/utils'
import { makeTownsBot } from './bot'
import { ethers } from 'ethers'
import { z } from 'zod'
import { stringify as superjsonStringify } from 'superjson'
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
import { getBalance, readContract, waitForTransactionReceipt, writeContract } from 'viem/actions'
import simpleAppAbi from '@towns-protocol/generated/dev/abis/SimpleApp.abi'
import { parseEther, zeroAddress } from 'viem'

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
    const townsConfig = townsEnv().makeTownsConfig()

    const bob = new SyncAgentTest(undefined, townsConfig)
    const appRegistryDapp = new AppRegistryDapp(
        townsConfig.base.chainConfig,
        makeBaseProvider(townsConfig),
    )
    const spaceDapp = new SpaceDapp(townsConfig.base.chainConfig, makeBaseProvider(townsConfig))
    let bobClient: SyncAgent

    const alice = new SyncAgentTest(undefined, townsConfig)
    let aliceClient: SyncAgent

    const carol = new SyncAgentTest(undefined, townsConfig)
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
        ethersProvider = makeBaseProvider(townsConfig)
        await bobClient.riverConnection.call((client) =>
            Promise.all([
                client.debugForceMakeMiniblock(spaceId, { forceSnapshot: true }),
                client.debugForceMakeMiniblock(channelId, { forceSnapshot: true }),
            ]),
        )
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
        const fundingAppTx = await bob.signer.sendTransaction({
            to: address,
            value: ethers.utils.parseEther('0.5').toBigInt(),
        })
        await fundingAppTx.wait()
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
            SpaceAddressFromSpaceId(spaceId),
            ethers.utils.parseEther('0.02').toBigInt(), // sending more to cover protocol fee
        )
        const receipt = await tx.wait()
        expect(receipt.status).toBe(1)
        const installedApps = await space.AppAccount.read.getInstalledApps()
        expect(installedApps).toContain(appAddress)

        const delegateWallet = ethers.Wallet.createRandom()
        const signerContext = await makeSignerContext(botWallet, delegateWallet)
        const rpcClient = await makeRiverRpcClient(
            makeRiverProvider(townsConfig),
            townsConfig.river.chainConfig,
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
            appAddress,
        )
        expect(appPrivateData).toBeDefined()
    }

    const shouldRegisterBotInAppRegistry = async () => {
        const appRegistryUrl = townsEnv().getAppRegistryUrl(process.env.RIVER_ENV)
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
        const { jwtMiddleware, handler } = bot.start()
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

    it('should show bot in member list and apps set when installed', async () => {
        const channelStreamView = await bobClient.riverConnection.call(async (client) => {
            return await client.getStream(channelId)
        })
        const { apps, joined } = channelStreamView.getMembers()
        expect(apps.has(botClientAddress)).toBe(true)
        expect(joined.has(botClientAddress)).toBe(true)
        expect(joined.get(botClientAddress)?.appAddress).toBe(appAddress)
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
                chainId: townsConfig.base.chainConfig.chainId,
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

    it('should be able to get channel inception event', async () => {
        const inception = await bot.snapshot.getChannelInception(channelId)
        expect(inception?.spaceId).toBeDefined()
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
        await appRegistryDapp.uninstallApp(bob.signer, appAddress, SpaceAddressFromSpaceId(spaceId))
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

    // TODO: figure out later - should scrubber be able to scrub uninstalled apps?
    it.skip('should not show bot in member list and apps set after uninstallation', async () => {
        const channelStreamView = await bobClient.riverConnection.call(async (client) => {
            return await client.getStream(channelId)
        })
        const { apps, joined } = channelStreamView.getMembers()
        expect(apps.has(botClientAddress)).toBe(false)
        expect(joined.has(botClientAddress)).toBe(false)
    })

    it('should send message with image attachment from URL with alt text', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const imageUrl = 'https://placehold.co/800x600.png'
        const altText = 'A beautiful placeholder image'

        const { eventId } = await bot.sendMessage(channelId, 'Image with alt text', {
            attachments: [{ type: 'image', url: imageUrl, alt: altText }],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        expect(message?.content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined
        expect(attachments).toHaveLength(1)
        expect(attachments?.[0].type).toBe('image')
        const image = attachments?.[0].type === 'image' ? attachments?.[0] : undefined
        expect(image).toBeDefined()
        expect(image?.info.url).toBe(imageUrl)
    })

    it('should gracefully handle non-image URL (skip with warning)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        // Use a URL that returns non-image content type
        const nonImageUrl = 'https://httpbin.org/json'
        const { eventId } = await bot.sendMessage(channelId, 'This should skip the attachment', {
            attachments: [{ type: 'image', url: nonImageUrl }],
        })
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        // Message should still be sent, just without the attachment
        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        expect(message?.content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined
        expect(attachments).toHaveLength(0)
    })

    it('should gracefully handle invalid URL (404)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        // Use a URL that returns 404
        const invalidUrl = 'https://httpbin.org/status/404'

        const { eventId } = await bot.sendMessage(channelId, 'This should handle 404 gracefully', {
            attachments: [{ type: 'image', url: invalidUrl }],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        // Message should still be sent, just without the attachment
        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        expect(message?.content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
    })

    function createTestPNG(width: number, height: number): Uint8Array {
        // PNG signature
        const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

        // IHDR chunk
        const ihdrData = new Uint8Array(13)
        const view = new DataView(ihdrData.buffer)
        view.setUint32(0, width, false) // Width
        view.setUint32(4, height, false) // Height
        ihdrData[8] = 8 // Bit depth
        ihdrData[9] = 2 // Color type (truecolor)
        ihdrData[10] = 0 // Compression
        ihdrData[11] = 0 // Filter
        ihdrData[12] = 0 // Interlace

        // Create IHDR chunk with CRC
        const ihdrChunk = new Uint8Array(12 + 13)
        new DataView(ihdrChunk.buffer).setUint32(0, 13, false)
        ihdrChunk.set([73, 72, 68, 82], 4) // 'IHDR'
        ihdrChunk.set(ihdrData, 8)
        new DataView(ihdrChunk.buffer).setUint32(21, 0, false) // CRC placeholder

        // IDAT chunk (minimal data)
        const idatData = new Uint8Array(100) // Minimal compressed data
        const idatChunk = new Uint8Array(12 + 100)
        new DataView(idatChunk.buffer).setUint32(0, 100, false)
        idatChunk.set([73, 68, 65, 84], 4) // 'IDAT'
        idatChunk.set(idatData, 8)
        new DataView(idatChunk.buffer).setUint32(108, 0, false) // CRC placeholder

        // IEND chunk
        const iendChunk = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])

        // Combine all chunks
        const png = new Uint8Array(
            signature.length + ihdrChunk.length + idatChunk.length + iendChunk.length,
        )
        png.set(signature, 0)
        png.set(ihdrChunk, signature.length)
        png.set(idatChunk, signature.length + ihdrChunk.length)
        png.set(iendChunk, signature.length + ihdrChunk.length + idatChunk.length)

        return png
    }

    it('should send chunked media with Uint8Array data', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const testData = createTestPNG(100, 100)

        const { eventId } = await bot.sendMessage(channelId, 'Chunked media test', {
            attachments: [
                {
                    type: 'chunked',
                    data: testData,
                    filename: 'test.png',
                    mimetype: 'image/png',
                    width: 100,
                    height: 100,
                },
            ],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        expect(message?.content?.kind).toBe(RiverTimelineEvent.ChannelMessage)

        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined

        expect(attachments).toHaveLength(1)
        expect(attachments?.[0].type).toBe('chunked_media')

        const chunkedMedia =
            attachments?.[0].type === 'chunked_media' ? attachments?.[0] : undefined
        expect(chunkedMedia).toBeDefined()
        expect(chunkedMedia?.info.filename).toBe('test.png')
        expect(chunkedMedia?.info.mimetype).toBe('image/png')
        expect(chunkedMedia?.info.widthPixels).toBe(100)
        expect(chunkedMedia?.info.heightPixels).toBe(100)
        expect(chunkedMedia?.streamId).toBeDefined()
        expect(chunkedMedia?.encryption).toBeDefined()
    })

    it('should send chunked media with Blob data and auto-detect dimensions', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const testData = createTestPNG(200, 150)
        const blob = new Blob([testData], { type: 'image/png' })

        const { eventId } = await bot.sendMessage(channelId, 'Blob test', {
            attachments: [
                {
                    type: 'chunked',
                    data: blob,
                    filename: 'blob-test.png',
                },
            ],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined

        expect(attachments).toHaveLength(1)
        const chunkedMedia =
            attachments?.[0].type === 'chunked_media' ? attachments?.[0] : undefined
        expect(chunkedMedia?.info.widthPixels).toBe(200)
        expect(chunkedMedia?.info.heightPixels).toBe(150)
    })

    it('should handle large chunked media (multiple chunks)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        // Create 2.5MB of data - will create mulitple chunks
        const largeData = new Uint8Array(2500000)
        for (let i = 0; i < largeData.length; i++) {
            largeData[i] = i % 256
        }

        const { eventId } = await bot.sendMessage(channelId, 'Large media test', {
            attachments: [
                {
                    type: 'chunked',
                    data: largeData,
                    filename: 'large-file.bin',
                    mimetype: 'application/octet-stream',
                },
            ],
        })

        await waitFor(
            () =>
                expect(
                    bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
                ).toBeDefined(),
            { timeoutMS: 30000 },
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined

        expect(attachments).toHaveLength(1)
        const chunkedMedia =
            attachments?.[0].type === 'chunked_media' ? attachments?.[0] : undefined
        expect(chunkedMedia?.info.sizeBytes).toBe(BigInt(2500000))
    })

    it('should send mixed attachments (URL + chunked)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const testData = createTestPNG(50, 50)
        const imageUrl = 'https://placehold.co/100x100.png'

        const { eventId } = await bot.sendMessage(channelId, 'Mixed attachments', {
            attachments: [
                { type: 'image', url: imageUrl },
                {
                    type: 'chunked',
                    data: testData,
                    filename: 'generated.png',
                    mimetype: 'image/png',
                },
            ],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        const attachments =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage
                ? message?.content?.attachments
                : undefined

        expect(attachments).toHaveLength(2)
        expect(attachments?.[0].type).toBe('image')
        expect(attachments?.[1].type).toBe('chunked_media')
    })

    it('should send and receive GM messages with schema validation', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const messageSchema = z.object({ text: z.string(), count: z.number() })

        const receivedGmEvents: Array<{ typeUrl: string; data: { text: string; count: number } }> =
            []

        bot.onGmMessage('test.typed.v1', messageSchema, (_h, e) => {
            receivedGmEvents.push({ typeUrl: e.typeUrl, data: e.data })
        })

        const testData = { text: 'Hello', count: 42 }
        // Bob sends the message so bot receives it (bot filters its own messages)
        const jsonString = superjsonStringify(testData)
        await bobClient.riverConnection.call((client) =>
            client.sendChannelMessage_GM(channelId, {
                content: {
                    typeUrl: 'test.typed.v1',
                    value: new TextEncoder().encode(jsonString),
                },
            }),
        )

        await waitFor(() => receivedGmEvents.length > 0)

        const event = receivedGmEvents[0]
        expect(event).toBeDefined()
        expect(event.typeUrl).toBe('test.typed.v1')
        expect(event.data).toEqual(testData)
    })

    it('should handle GM with Date objects (superjson serialization)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const eventSchema = z.object({
            eventType: z.string(),
            timestamp: z.date(),
        })
        const testDate = new Date('2025-01-15T12:00:00Z')
        const { eventId } = await bot.sendGM(channelId, 'test.date.v1', eventSchema, {
            eventType: 'test',
            timestamp: testDate,
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )

        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)

        expect(message?.content?.kind).toBe(RiverTimelineEvent.ChannelMessage)
        const gmData =
            message?.content?.kind === RiverTimelineEvent.ChannelMessage &&
            message?.content?.content.msgType === MessageType.GM
                ? message?.content?.content.data
                : undefined
        expect(gmData).toBeDefined()
        expect(gmData).toStrictEqual(
            new TextEncoder().encode(
                superjsonStringify({ eventType: 'test', timestamp: testDate }),
            ),
        )
    })

    it('should handle multiple handlers for different typeUrls', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const schema1 = z.object({ type: z.literal('type1'), value: z.number() })
        const schema2 = z.object({ type: z.literal('type2'), text: z.string() })

        const receivedType1: Array<{ type: 'type1'; value: number }> = []
        const receivedType2: Array<{ type: 'type2'; text: string }> = []

        bot.onGmMessage('test.multi.type1', schema1, (_h, e) => {
            receivedType1.push(e.data)
        })
        bot.onGmMessage('test.multi.type2', schema2, (_h, e) => {
            receivedType2.push(e.data)
        })

        const data1 = { type: 'type1' as const, value: 123 }
        const data2 = { type: 'type2' as const, text: 'hello' }

        await bobClient.riverConnection.call((client) =>
            client.sendChannelMessage_GM(channelId, {
                content: {
                    typeUrl: 'test.multi.type1',
                    value: new TextEncoder().encode(superjsonStringify(data1)),
                },
            }),
        )
        await bobClient.riverConnection.call((client) =>
            client.sendChannelMessage_GM(channelId, {
                content: {
                    typeUrl: 'test.multi.type2',
                    value: new TextEncoder().encode(superjsonStringify(data2)),
                },
            }),
        )

        await waitFor(() => receivedType1.length > 0 && receivedType2.length > 0)

        expect(receivedType1[0]).toEqual(data1)
        expect(receivedType2[0]).toEqual(data2)
    })

    it('should handle raw GM messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        const receivedMessages: Array<{ typeUrl: string; message: Uint8Array }> = []
        bot.onRawGmMessage((_h, e) => {
            receivedMessages.push({ typeUrl: e.typeUrl, message: e.message })
        })

        const message = new TextEncoder().encode('Hello, world!')
        await bobClient.riverConnection.call((client) =>
            client.sendChannelMessage_GM(channelId, {
                content: {
                    typeUrl: 'test.raw.v1',
                    value: message,
                },
            }),
        )

        await waitFor(() => receivedMessages.length > 0)
        expect(receivedMessages[0].typeUrl).toBe('test.raw.v1')
        expect(receivedMessages[0].message).toEqual(message)
    })

    it('bot.appAddress should be equal to the address of the app contract', async () => {
        expect(bot.appAddress).toBe(appAddress)
    })

    it('bot should be able to read app contract', async () => {
        expect(appAddress).toBeDefined()
        const botOwner = await readContract(bot.viem, {
            address: bot.appAddress,
            abi: simpleAppAbi,
            functionName: 'moduleOwner',
            args: [],
        })
        expect(botOwner).toBe(bob.userId)
    })

    it('bot should be able to call writeContract (send currency to another user)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const aliceBalance_before = await getBalance(bot.viem, {
            address: alice.userId,
        })

        const hash = await writeContract(bot.viem, {
            address: bot.appAddress,
            abi: simpleAppAbi,
            functionName: 'sendCurrency',
            args: [alice.userId, zeroAddress, parseEther('0.01')],
        })
        await waitForTransactionReceipt(bot.viem, { hash: hash })
        const aliceBalance_after = await getBalance(bot.viem, {
            address: alice.userId,
        })
        expect(aliceBalance_after).toBeGreaterThan(aliceBalance_before)
    })
})
