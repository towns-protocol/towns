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
    ClientV2,
    getNftRuleData,
    waitForRoleCreated,
    createChannel,
    isDefined,
    genIdBlob,
    ParsedEvent,
    type ChannelMessageEvent,
    makeUniqueMediaStreamId,
} from '@towns-protocol/sdk'
import { describe, it, expect, beforeAll, vi } from 'vitest'
import type { BasePayload, Bot, BotCommand, BotPayload, DecryptedInteractionResponse } from './bot'
import { bin_fromHexString, bin_toBase64, check, dlog } from '@towns-protocol/utils'
import { makeTownsBot } from './bot'
import { ethers } from 'ethers'
import { z } from 'zod'
import { stringify as superjsonStringify } from 'superjson'
import {
    ForwardSettingValue,
    InteractionRequestPayload,
    InteractionRequestPayload_Signature_SignatureType,
    InteractionResponsePayload,
    MediaInfoSchema,
    type PlainMessage,
} from '@towns-protocol/proto'
import {
    AppRegistryDapp,
    ETH_ADDRESS,
    Permission,
    Rules,
    SpaceAddressFromSpaceId,
    SpaceDapp,
    TestERC721,
    TestERC20,
    type Address,
} from '@towns-protocol/web3'
import { createServer } from 'node:http2'
import { serve } from '@hono/node-server'
import { randomUUID } from 'crypto'
import { getBalance, readContract, waitForTransactionReceipt } from 'viem/actions'
import townsAppAbi from '@towns-protocol/generated/dev/abis/ITownsApp.abi'
import channelsFacetAbi from '@towns-protocol/generated/dev/abis/Channels.abi'
import walletLinkAbi from '@towns-protocol/generated/dev/abis/WalletLink.abi'
import {
    createPublicClient,
    createWalletClient,
    encodeAbiParameters,
    encodeFunctionData,
    http,
    parseEther,
    type Hex,
    type PublicClient,
    type Transport,
    type Chain,
    type WalletClient,
} from 'viem'
import { foundry } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts'
import { createBundlerClient } from 'viem/account-abstraction'
import {
    discoverAccount,
    modularAccountAbi,
    toModularSmartAccount,
} from '@towns-protocol/smart-account'
import { execute } from 'viem/experimental/erc7821'
import { UserDevice } from '@towns-protocol/encryption'
import { nanoid } from 'nanoid'
import { create } from '@bufbuild/protobuf'
import { deriveKeyAndIV } from '@towns-protocol/sdk-crypto'
import IAppInstallerAbi from '@towns-protocol/generated/dev/abis/IAppInstaller.abi'

const log = dlog('test:bot')

const WEBHOOK_URL = `https://localhost:${process.env.BOT_PORT}/webhook`

// Smart account constants
const BUNDLER_RPC_URL = process.env.BUNDLER_RPC_URL ?? 'http://127.0.0.1:4337'
const LINKED_WALLET_MESSAGE = 'Link your external wallet'
const ANVIL_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

// Minimal ABI to read execution manifest from AccountModules contract
const IExecutionModuleABI = [
    {
        name: 'executionManifest',
        type: 'function',
        inputs: [],
        outputs: [
            {
                name: '',
                type: 'tuple',
                components: [
                    {
                        name: 'executionFunctions',
                        type: 'tuple[]',
                        components: [
                            { name: 'executionSelector', type: 'bytes4' },
                            { name: 'skipRuntimeValidation', type: 'bool' },
                            { name: 'allowGlobalValidation', type: 'bool' },
                        ],
                    },
                    {
                        name: 'executionHooks',
                        type: 'tuple[]',
                        components: [
                            { name: 'executionSelector', type: 'bytes4' },
                            { name: 'entityId', type: 'uint32' },
                            { name: 'isPreHook', type: 'bool' },
                            { name: 'isPostHook', type: 'bool' },
                        ],
                    },
                    { name: 'interfaceIds', type: 'bytes4[]' },
                ],
            },
        ],
        stateMutability: 'pure',
    },
] as const

const SLASH_COMMANDS = [
    { name: 'help', description: 'Get help with bot commands' },
    { name: 'status', description: 'Check bot status' },
] as const satisfies BotCommand[]

type OnMessageType = BotPayload<'message'>
type OnChannelJoin = BotPayload<'channelJoin'>
type OnMessageEditType = BotPayload<'messageEdit'>
type OnSlashCommandType = BotPayload<'slashCommand', typeof SLASH_COMMANDS>

describe('Bot', { sequential: true }, () => {
    const subscriptions: (() => void)[] = []
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

    // Smart account variables for Bob
    let bobSmartAccountOwner: PrivateKeyAccount
    let bobSmartAccount: Awaited<ReturnType<typeof toModularSmartAccount>>
    let bobSmartAccountAddress: Address
    let viemPublicClient: PublicClient<Transport, Chain>
    let viemWalletClient: WalletClient<Transport, Chain, PrivateKeyAccount>
    let bundlerClient: ReturnType<typeof createBundlerClient>

    beforeAll(async () => {
        await shouldInitializeBotOwner()
        await shouldSetupBobSmartAccount()
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

    afterEach(() => {
        subscriptions.forEach((unsub) => unsub())
        subscriptions.splice(0, subscriptions.length)
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

    const shouldSetupBobSmartAccount = async () => {
        // Create viem clients using townsConfig RPC URL
        const baseRpcUrl = townsConfig.base.rpcUrl
        const spaceFactoryAddress = townsConfig.base.chainConfig.addresses.spaceFactory

        viemPublicClient = createPublicClient({
            chain: foundry,
            transport: http(baseRpcUrl),
        })

        viemWalletClient = createWalletClient({
            chain: foundry,
            transport: http(baseRpcUrl),
            account: privateKeyToAccount(ANVIL_PRIVATE_KEY),
        })

        bundlerClient = createBundlerClient({
            client: viemPublicClient,
            transport: http(BUNDLER_RPC_URL),
        })

        // Generate a new private key for the smart account owner
        bobSmartAccountOwner = privateKeyToAccount(generatePrivateKey())

        // Discover the smart account address
        const discovered = await discoverAccount(
            viemPublicClient,
            bobSmartAccountOwner.address,
            'modular',
        )
        bobSmartAccountAddress = discovered.address

        // Create the modular smart account instance
        bobSmartAccount = await toModularSmartAccount({
            client: viemPublicClient,
            owner: bobSmartAccountOwner,
            address: bobSmartAccountAddress,
        })

        // Fund the smart account using Anvil's default funded account
        const fundTx = await viemWalletClient.sendTransaction({
            to: bobSmartAccount.address,
            value: parseEther('1'),
        })
        await viemPublicClient.waitForTransactionReceipt({ hash: fundTx })

        // Create a viem account from Bob's root wallet for signing
        const bobViemAccount = privateKeyToAccount(bob.rootWallet.privateKey as Hex)

        // Get nonce for Bob's root key
        const nonce = await viemPublicClient.readContract({
            address: spaceFactoryAddress,
            abi: walletLinkAbi,
            functionName: 'getLatestNonceForRootKey',
            args: [bobViemAccount.address],
        })

        // Create EIP-712 signature from Bob's root wallet using viem
        // Domain and types must match WalletLinkBase.sol
        const signature = await bobViemAccount.signTypedData({
            domain: {
                name: 'SpaceFactory',
                version: '1',
                chainId: foundry.id,
                verifyingContract: spaceFactoryAddress,
            },
            types: {
                LinkedWallet: [
                    { name: 'message', type: 'string' },
                    { name: 'userID', type: 'address' },
                    { name: 'nonce', type: 'uint256' },
                ],
            },
            primaryType: 'LinkedWallet',
            message: {
                message: LINKED_WALLET_MESSAGE,
                userID: bobSmartAccount.address,
                nonce,
            },
        })

        // Send userOp to link the smart account to Bob's root key
        // Note: Explicit gas limits required for Alto bundler with modular accounts
        const userOpHash = await bundlerClient.sendUserOperation({
            account: bobSmartAccount,
            calls: [
                {
                    to: spaceFactoryAddress,
                    abi: walletLinkAbi,
                    functionName: 'linkCallerToRootKey',
                    args: [
                        {
                            addr: bobViemAccount.address,
                            signature,
                            message: LINKED_WALLET_MESSAGE,
                        },
                        nonce,
                    ],
                },
            ],
            callGasLimit: 300000n,
            verificationGasLimit: 500000n,
            preVerificationGas: 100000n,
        })

        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })
        expect(receipt.success).toBe(true)

        // Verify the link
        const isLinked = await viemPublicClient.readContract({
            address: spaceFactoryAddress,
            abi: walletLinkAbi,
            functionName: 'checkIfLinked',
            args: [bobViemAccount.address, bobSmartAccount.address],
        })
        expect(isLinked).toBe(true)
        const accountModulesAddress = townsConfig.base.chainConfig.addresses.accountModules
        if (!accountModulesAddress) {
            throw new Error('AccountModules address is not configured')
        }
        const isAlreadyInstalled = await viemPublicClient.readContract({
            address: accountModulesAddress,
            abi: [
                {
                    name: 'isInstalled',
                    type: 'function',
                    inputs: [{ type: 'address', name: 'account' }],
                    outputs: [{ type: 'bool' }],
                    stateMutability: 'view',
                },
            ] as const,
            functionName: 'isInstalled',
            args: [bobSmartAccount.address],
        })
        if (isAlreadyInstalled) {
            return
        }
        const manifest = await viemPublicClient.readContract({
            address: accountModulesAddress,
            abi: IExecutionModuleABI,
            functionName: 'executionManifest',
        })
        const moduleInstallData = encodeAbiParameters(
            [{ type: 'address' }],
            [bobSmartAccount.address],
        )
        const installExecutionCallData = encodeFunctionData({
            abi: modularAccountAbi,
            functionName: 'installExecution',
            args: [accountModulesAddress, manifest, moduleInstallData],
        })
        const executeBatchCallData = encodeFunctionData({
            abi: modularAccountAbi,
            functionName: 'executeBatch',
            args: [
                [
                    {
                        target: bobSmartAccount.address,
                        value: 0n,
                        data: installExecutionCallData,
                    },
                ],
            ],
        })

        const encodedInstallCallData = await bobSmartAccount.encodeCallData(executeBatchCallData)

        // Use explicit executeBatch calldata to avoid SelfCallRecursionDepthExceeded.
        // Increased gas limits to avoid "out of gas: not enough gas for reentrancy sentry" error
        const installModulesHash = await bundlerClient.sendUserOperation({
            account: bobSmartAccount,
            callData: encodedInstallCallData,
            callGasLimit: 2000000n,
            verificationGasLimit: 500000n,
            preVerificationGas: 100000n,
        })

        const installModulesReceipt = await bundlerClient.waitForUserOperationReceipt({
            hash: installModulesHash,
        })
        expect(installModulesReceipt.success).toBe(true)
    }

    const shouldMintBot = async () => {
        botWallet = ethers.Wallet.createRandom().connect(ethersProvider)
        botClientAddress = botWallet.address as Address
        const fundBotClientAddressTx = await bob.signer.sendTransaction({
            to: botClientAddress,
            value: ethers.utils.parseEther('0.5'),
        })
        await fundBotClientAddressTx.wait()

        const tx = await appRegistryDapp.createApp(
            bob.signer,
            BOT_USERNAME,
            [...Object.values(Permission)], // all permissions
            botClientAddress,
            ethers.utils.parseEther('0.01').toBigInt(),
            31536000n,
        )
        const receipt = await tx.wait()
        const { app: address } = appRegistryDapp.getCreateAppEvent(receipt, bob.userId)
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
        await expect(
            botClient.initializeUser({ appAddress, skipSync: true }),
        ).resolves.toBeDefined()
        await botClient.uploadDeviceKeys()

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
        await botClient.stop()
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
        expect(bot.appAddress).toBe(appAddress)
        const app = bot.start()
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

    it('should have Bob smart account linked to root key', async () => {
        const isLinked = await viemPublicClient.readContract({
            address: townsConfig.base.chainConfig.addresses.spaceFactory,
            abi: walletLinkAbi,
            functionName: 'checkIfLinked',
            args: [bob.userId, bobSmartAccountAddress],
        })
        expect(isLinked).toBe(true)
    })

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

    it('should be entitled', async () => {
        const spaceDapp = bobClient.riverConnection.spaceDapp

        const isInstalled = await spaceDapp.isAppInstalled(spaceId, bot.appAddress)
        expect(isInstalled).toBe(true)

        const isEntitledRead = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.Read,
        )
        const isEntitledWrite = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.Write,
        )
        const isEntitledReact = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.React,
        )
        const isEntitledModifyBanning = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.ModifyBanning,
        )
        const isEntitledModifySpaceSettings = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.ModifySpaceSettings,
        )
        const isEntitledRedact = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.Redact,
        )
        const isEntitledPinMessage = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.PinMessage,
        )
        const isEntitledAddRemove = await spaceDapp.isAppEntitled(
            spaceId,
            bot.botId,
            bot.appAddress,
            Permission.AddRemoveChannels,
        )
        expect(isEntitledRead).toBe(true)
        expect(isEntitledWrite).toBe(true)
        expect(isEntitledReact).toBe(true)
        expect(isEntitledModifyBanning).toBe(true)
        expect(isEntitledModifySpaceSettings).toBe(true)
        expect(isEntitledRedact).toBe(true)
        expect(isEntitledPinMessage).toBe(true)
        expect(isEntitledAddRemove).toBe(true)
    })

    it('should receive a message forwarded', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const timeBeforeSendMessage = Date.now()
        let receivedMessages: OnMessageType[] = []
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )

        const TEST_MESSAGE = 'This message should not be forwarded'
        await bobDefaultChannel.sendMessage(TEST_MESSAGE)

        await new Promise((resolve) => setTimeout(resolve, 2500))
        expect(receivedMessages).toHaveLength(0)
    })

    it('should receive channel join event when alice joins the channel if bot is listening to channel join events', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedChannelJoinEvents: OnChannelJoin[] = []
        subscriptions.push(
            bot.onChannelJoin((_h, e) => {
                receivedChannelJoinEvents.push(e)
            }),
        )
        await aliceClient.spaces.joinSpace(spaceId, alice.signer)
        await waitFor(() => receivedChannelJoinEvents.length > 0)
        expect(receivedChannelJoinEvents.find((x) => x.userId === alice.userId)).toBeDefined()
    })

    // !! requires previous test to run first
    it('should see alice and bob in the channel', async () => {
        const streamView = await bot.getStreamView(channelId)
        expect(streamView.getMembers().joined.has(alice.userId)).toBe(true)
        expect(streamView.getMembers().joined.has(bob.userId)).toBeDefined()
    })

    it('should receive slash command messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnSlashCommandType[] = []
        subscriptions.push(
            bot.onSlashCommand('help', (_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onSlashCommand('help', (_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onSlashCommand('help', (_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onSlashCommand('status', (_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onMessageEdit((_h, e) => {
                receivedEditEvents.push(e)
            }),
        )

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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                if (e.threadId) {
                    receivedThreadMessages.push(e)
                }
            }),
        )

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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                if (e.isMentioned) {
                    receivedMentionedEvents.push(e)
                }
            }),
        )
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMentionedInThreadEvents.push(e)
            }),
        )

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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )

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
        subscriptions.push(
            bot.onReaction((_h, e) => {
                receivedReactionEvents.push(e)
            }),
        )

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
        subscriptions.push(
            bot.onRedaction((_h, e) => {
                receivedRedactionEvents.push(e)
            }),
        )
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

    it('bot can mention bob', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'Hello @bob', {
            mentions: [
                {
                    userId: bob.userId,
                    displayName: 'bob',
                },
            ],
        })
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        const channelMessage = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === messageId,
        )?.content as ChannelMessageEvent

        expect(channelMessage.mentions).toBeDefined()
        expect(channelMessage.mentions?.length).toBe(1)
        expect(channelMessage.mentions?.[0].userId).toBe(bob.userId)
        expect(channelMessage.mentions?.[0].displayName).toBe('bob')
    })

    it('bot can mention channel', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'Hello @channel', {
            mentions: [{ atChannel: true }],
        })
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        const channelMessage = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === messageId,
        )
        let channelMessageEvent: ChannelMessageEvent | undefined
        if (channelMessage?.content?.kind === RiverTimelineEvent.ChannelMessage) {
            channelMessageEvent = channelMessage.content
        } else {
            throw new Error('Message is not a channel message')
        }

        expect(channelMessageEvent.mentions).toBeDefined()
        expect(channelMessageEvent.mentions?.length).toBe(1)
        // @ts-expect-error - types of timeline is wrong
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(channelMessageEvent.mentions?.[0].mentionBehavior?.case).toBe('atChannel')
    })

    it('bot can fetch existing decryption keys when sending a message', async () => {
        // on a fresh boot the bot won't have any keys in cache, so it should fetch them from the app server if they exist
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId1 } = await bot.sendMessage(channelId, 'Hello message 1')
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId1)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        // DELETE OUTBOUND GROUP SESSIONS to simulate fresh server start
        await (bot['client'] as ClientV2).crypto.cryptoStore.deleteOutboundGrounpSessions(channelId)
        await (bot['client'] as ClientV2).crypto.cryptoStore.deleteHybridGroupSessions(channelId)

        const { eventId: messageId2 } = await bot.sendMessage(channelId, 'Hello message 2')
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId2)
                    ?.content?.kind,
            ).toBe(RiverTimelineEvent.ChannelMessage),
        )
        const event1 = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId1)
        const event2 = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === messageId2)
        expect(event1?.sessionId).toEqual(event2?.sessionId)
    })

    it('bot shares new decrytion keys with users created while sending a message', async () => {
        // the bot should almost never have to create a new key - usually they will get a message in the channel first and can use that key to encrypt
        // but in the case where they've never received one and want to send a message, they will create a new key and share it with the users in the channel
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        // have bob create a new channel, but don't send messages
        const newChannelId = await bobClient.spaces
            .getSpace(spaceId)
            .createChannel('test-channel', bob.signer)

        const newChannel = bobClient.spaces.getSpace(spaceId).getChannel(newChannelId)
        // add the bot to the channel
        await bobClient.riverConnection.call((client) => client.joinUser(newChannelId, bot.botId))

        // bot sends message to the channel
        const { eventId: messageId } = await bot.sendMessage(newChannelId, 'Hello')

        log('bot sends message to new channel', messageId)
        // bob should see the DECRYPTED message
        await waitFor(
            () => {
                expect(
                    newChannel.timeline.events.value.find((x) => x.eventId === messageId)?.content
                        ?.kind,
                ).toBe(RiverTimelineEvent.ChannelMessage)
            },
            { timeoutMS: 20000 },
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                messages.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedReplyEvents.push(e)
            }),
        )
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
        subscriptions.push(
            bot.onTip((_h, e) => {
                receivedTipEvents.push(e)
            }),
        )

        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId: messageId } = await bot.sendMessage(channelId, 'hii')

        const balanceBefore = (await ethersProvider.getBalance(appAddress)).toBigInt()

        // Get space instance and appId for bot tip
        const space = spaceDapp.getSpace(spaceId)
        if (!space) {
            throw new Error('Space not found')
        }
        const appId = await space.AppAccount.read.getAppId(appAddress)

        // bob tips the bot
        await bobDefaultChannel.sendTip(
            messageId,
            {
                type: 'bot',
                appId: appId,
                amount: ethers.utils.parseUnits('0.01').toBigInt(),
                currency: ETH_ADDRESS,
                chainId: townsConfig.base.chainConfig.chainId,
                appAddress: appAddress,
                botId: bot.botId,
            },
            bob.signer,
        )
        // app address is the address of the bot contract.
        const balance = (await ethersProvider.getBalance(appAddress)).toBigInt()
        // Bot tips have no protocol fee, so the balance should increase by exactly 0.01 ETH
        const expectedTipAmount = ethers.utils.parseUnits('0.01').toBigInt()
        expect(balance).toEqual(balanceBefore + expectedTipAmount)
        await waitFor(() => receivedTipEvents.length > 0)
        const tipEvent = receivedTipEvents.find((x) => x.messageId === messageId)
        expect(tipEvent).toBeDefined()
        expect(tipEvent?.userId).toBe(bob.userId)
        expect(tipEvent?.spaceId).toBe(spaceId)
        expect(tipEvent?.channelId).toBe(channelId)
        expect(tipEvent?.amount).toBe(ethers.utils.parseUnits('0.01').toBigInt())
        expect(tipEvent?.currency).toBe(ETH_ADDRESS)
        expect(tipEvent?.senderAddress).toBe(bob.userId)
        expect(tipEvent?.receiverAddress).toBe(bot.appAddress)
        expect(tipEvent?.receiverUserId).toBe(bot.botId)
    })

    it('bot can use sendTip() to send tips using app balance', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedMessages: OnMessageType[] = []

        subscriptions.push(
            bot.onMessage(async (handler, event) => {
                const result = await handler.sendTip({
                    userId: bob.userId,
                    amount: ethers.utils.parseUnits('0.005').toBigInt(),
                    messageId: event.eventId,
                    channelId: event.channelId,
                })
                expect(result.txHash).toBeDefined()
                expect(result.eventId).toBeDefined()
                receivedMessages.push(event)
            }),
        )

        const bobBalanceBefore = (await ethersProvider.getBalance(bob.userId)).toBigInt()
        // Bob sends a message asking for a tip
        const { eventId: bobMessageId } = await bobDefaultChannel.sendMessage('Tip me please!')
        await waitFor(() => receivedMessages.some((x) => x.eventId === bobMessageId))
        // Verify bob's balance increased
        const bobBalanceAfter = (await ethersProvider.getBalance(bob.userId)).toBigInt()
        expect(bobBalanceAfter).toBeGreaterThan(bobBalanceBefore)
    })

    it('bot can use sendTip() to send ERC-20 tips using app balance', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const tokenName = 'TestTipToken'
        const tokenAddress = await TestERC20.getContractAddress(tokenName)
        const tipAmount = 1000n
        await TestERC20.publicMint(tokenName, bot.appAddress, Number(tipAmount))

        const botBalanceBefore = await TestERC20.balanceOf(tokenName, bot.appAddress)
        expect(botBalanceBefore).toBeGreaterThanOrEqual(Number(tipAmount))

        const receivedMessages: OnMessageType[] = []
        subscriptions.push(
            bot.onMessage(async (handler, event) => {
                const result = await handler.sendTip({
                    userId: bob.userId,
                    amount: tipAmount,
                    messageId: event.eventId,
                    channelId: event.channelId,
                    currency: tokenAddress,
                })
                expect(result.txHash).toBeDefined()
                expect(result.eventId).toBeDefined()
                receivedMessages.push(event)
            }),
        )

        const bobTokenBalanceBefore = await TestERC20.balanceOf(tokenName, bob.userId)

        const { eventId: bobMessageId } = await bobDefaultChannel.sendMessage('Tip me ERC-20!')
        await waitFor(() => receivedMessages.some((x) => x.eventId === bobMessageId))

        const bobTokenBalanceAfter = await TestERC20.balanceOf(tokenName, bob.userId)
        expect(bobTokenBalanceAfter).toBeGreaterThan(bobTokenBalanceBefore)

        const botBalanceAfter = await TestERC20.balanceOf(tokenName, bot.appAddress)
        expect(botBalanceAfter).toBeLessThan(botBalanceBefore)
    })

    it('onEventRevoke (FORWARD_SETTING_ALL_MESSAGES) should be triggered when a message is revoked', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const receivedEventRevokeEvents: BotPayload<'eventRevoke'>[] = []
        subscriptions.push(
            bot.onEventRevoke((_h, e) => {
                receivedEventRevokeEvents.push(e)
            }),
        )
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
            subscriptions.push(
                bot.onEventRevoke((_h, e) => {
                    receivedEventRevokeEvents.push(e)
                }),
            )
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
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMentionedEvents.push(e)
            }),
        )
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

    // @miguel-nascimento 2025-12-08 flaky test
    it.skip('should send mixed attachments (URL + chunked)', async () => {
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

        subscriptions.push(
            bot.onGmMessage('test.typed.v1', messageSchema, (_h, e) => {
                receivedGmEvents.push({ typeUrl: e.typeUrl, data: e.data })
            }),
        )

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

        subscriptions.push(
            bot.onGmMessage('test.multi.type1', schema1, (_h, e) => {
                receivedType1.push(e.data)
            }),
        )
        subscriptions.push(
            bot.onGmMessage('test.multi.type2', schema2, (_h, e) => {
                receivedType2.push(e.data)
            }),
        )

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
        subscriptions.push(
            bot.onRawGmMessage((_h, e) => {
                receivedMessages.push({ typeUrl: e.typeUrl, message: e.message })
            }),
        )

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

    it('bot should be able to read app contract', async () => {
        expect(appAddress).toBeDefined()
        const botOwner = await readContract(bot.viem, {
            address: bot.appAddress,
            abi: townsAppAbi,
            functionName: 'moduleOwner',
            args: [],
        })
        expect(botOwner).toBe(bob.userId)
    })

    it('bot should be able to send funds to another user)', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const aliceBalance_before = await getBalance(bot.viem, {
            address: alice.userId,
        })

        const hash = await execute(bot.viem, {
            address: bot.appAddress,
            calls: [
                {
                    to: alice.userId,
                    value: parseEther('0.01'),
                },
            ],
        })
        await waitForTransactionReceipt(bot.viem, { hash: hash })
        const aliceBalance_after = await getBalance(bot.viem, {
            address: alice.userId,
        })
        expect(aliceBalance_after).toBeGreaterThan(aliceBalance_before)
    })

    it('should log error and continue processing if throws an error when handling an event', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error')
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        subscriptions.push(
            bot.onMessage(() => {
                throw new Error('test error')
            }),
        )
        await bobDefaultChannel.sendMessage('lol')
        await waitFor(() => consoleErrorSpy.mock.calls.length > 0)
        expect(consoleErrorSpy.mock.calls[0][0]).toContain(
            '[@towns-protocol/bot] Error while handling event',
        )
        consoleErrorSpy.mockRestore()
    })

    it('bot should be able to send messages in gated channels', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const spaceDapp = bobClient.riverConnection.spaceDapp
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const ruleData = getNftRuleData(testNft1Address)
        const permissions = [Permission.Read, Permission.Write, Permission.React]
        const roleName = 'TestNFT1 Gated Role read/write/react'
        const txn = await spaceDapp.createRole(
            spaceId,
            roleName,
            permissions,
            [],
            ruleData,
            bob.signer,
        )
        const { roleId, error: roleError } = await waitForRoleCreated(spaceDapp, spaceId, txn)
        expect(roleError).toBeUndefined()
        // create the channel on chain with these permissions
        const { channelId, error: channelError } = await createChannel(
            spaceDapp,
            bob.web3Provider,
            spaceId,
            'test-nft-1-gated-channel',
            [roleId!.valueOf()],
            bob.signer,
        )
        expect(channelError).toBeUndefined()
        check(isDefined(channelId), 'channelId is defined')
        // have bob grab the synced channel
        const newChannel = bobClient.spaces.getSpace(spaceId).getChannel(channelId)
        await waitFor(() => newChannel.value.status !== 'loading')
        // create the stream on the river node
        const { streamId: channelStreamId } = await bobClient.riverConnection.call((client) =>
            client.createChannel(spaceId, '', '', channelId),
        )
        expect(channelStreamId).toEqual(channelId)
        // join the bot to the channel
        // add the bot to the channel
        await bobClient.riverConnection.call((client) => client.joinUser(channelId, bot.botId))

        // bot sends message to the channel
        const { eventId: messageId } = await bot.sendMessage(channelId, 'Hello')

        log('bot sends message to new channel', messageId)
        // bob should see the DECRYPTED message
        await waitFor(
            () => {
                expect(
                    newChannel.timeline.events.value.find((x) => x.eventId === messageId)?.content
                        ?.kind,
                ).toBe(RiverTimelineEvent.ChannelMessage)
            },
            { timeoutMS: 20000 },
        )
    })

    it('bot can create channel, channel has the role, bob joins and sends message, bot receives message', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)

        type WhyDoINeedThis = BasePayload & { parsed: ParsedEvent }
        const streamEvents: WhyDoINeedThis[] = []
        const receivedMessages: OnMessageType[] = []
        subscriptions.push(
            bot.onStreamEvent((_h, e) => {
                log('stream event', e)
                streamEvents.push(e)
            }),
        )
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )

        const spaceDapp = bobClient.riverConnection.spaceDapp
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')
        const ruleData = getNftRuleData(testNft1Address)
        const permissions = [Permission.Read, Permission.Write]
        const roleName = `TestRole for bot channel bot wallet`

        // Bob creates a role with Read permission
        const txn = await spaceDapp.createRole(
            spaceId,
            roleName,
            permissions,
            [],
            ruleData,
            bob.signer,
        )

        const { roleId, error: roleError } = await waitForRoleCreated(spaceDapp, spaceId, txn)
        expect(roleError).toBeUndefined()
        check(isDefined(roleId), 'roleId is defined')
        log('bob created role', roleId)

        // Bot creates a new channel
        const newChannelId = await bot.createChannel(spaceId, {
            name: `test-channel-with-role-bot`,
            description: `Channel with role created by bot with bot wallet`,
        })

        log(`bot created channel`, newChannelId)

        // Query the roles assigned to the channel
        const channelRoles = await readContract(bot.viem, {
            address: SpaceAddressFromSpaceId(spaceId),
            abi: channelsFacetAbi,
            functionName: 'getRolesByChannel',
            args: [
                newChannelId.startsWith('0x')
                    ? (newChannelId as `0x${string}`)
                    : `0x${newChannelId}`,
            ],
        })

        log('channel roles', channelRoles)

        // Verify the created role is included in the channel's roles
        expect(channelRoles).toContain(BigInt(roleId))

        // Bob joins the new channel
        await bobClient.riverConnection.call((client) => client.joinStream(newChannelId))

        // Bob gets the channel
        const bobNewChannel = bobClient.spaces.getSpace(spaceId).getChannel(newChannelId)
        await waitFor(() => bobNewChannel.value.status !== 'loading', { timeoutMS: 10000 })

        // Bob sends a message in the new channel
        const testMessage = `Hello bot in new channel`
        log('bob sending message in new channel', {
            testMessage,
            botId: bot.botId,
            appAddress: bot.appAddress,
            bobUserId: bob.userId,
        })
        const { eventId } = await bobNewChannel.sendMessage(testMessage)
        log('bob sent message in new channel', eventId)

        await waitFor(() => streamEvents.length > 0, { timeoutMS: 15000 })
        await waitFor(() => expect(streamEvents.find((x) => x.eventId === eventId)).toBeDefined())

        // Wait for bot to receive the message
        await waitFor(() => receivedMessages.length > 0, { timeoutMS: 15000 })

        const receivedEvent = receivedMessages.find((x) => x.eventId === eventId)
        expect(receivedEvent).toBeDefined()
        expect(receivedEvent?.message).toBe(testMessage)
        expect(receivedEvent?.channelId).toBe(newChannelId)
        expect(receivedEvent?.userId).toBe(bobClient.userId)
    })

    it('bot should be able to send encrypted interaction request and user should send encrypted response', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
        const requestId = randomUUID()
        const interactionRequestContent: PlainMessage<InteractionRequestPayload['content']> = {
            case: 'signature',
            value: {
                id: requestId,
                data: '0x1234567890',
                chainId: '1',
                type: InteractionRequestPayload_Signature_SignatureType.PERSONAL_SIGN,
            },
        }
        const { eventId } = await bot.sendInteractionRequest(channelId, interactionRequestContent)

        // Wait for Bob to receive the interaction request
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        // Wait for decryption to complete
        await waitFor(() => {
            const event = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
            if (event?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
                return false
            }
            return event?.content?.payload !== undefined
        })

        const decryptedEvent = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === eventId,
        )
        expect(decryptedEvent?.content?.kind).toBe(RiverTimelineEvent.InteractionRequest)
        if (decryptedEvent?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
            throw new Error('Event is not an InteractionRequest')
        }

        const decryptedPayload = decryptedEvent.content.payload
        const encryptionDevice = decryptedPayload?.encryptionDevice as UserDevice
        expect(decryptedPayload).toBeDefined()
        expect(encryptionDevice).toBeDefined()
        expect(decryptedPayload?.content.case).toBe('signature')
        if (decryptedPayload?.content.case === 'signature') {
            expect(decryptedPayload.content.value.id).toBe(requestId)
            expect(decryptedPayload.content.value.data).toBe('0x1234567890')
        }

        // bob should be able to send interaction response to the bot using the decrypted encryption device
        const recipient = bin_fromHexString(botClientAddress)
        const interactionResponsePayload: PlainMessage<InteractionResponsePayload> = {
            salt: genIdBlob(),
            content: {
                case: 'signature',
                value: {
                    requestId: requestId,
                    signature: '0x123222222222',
                },
            },
        }

        const receivedInteractionResponses: Array<DecryptedInteractionResponse> = []
        subscriptions.push(
            bot.onInteractionResponse((_h, e) => {
                receivedInteractionResponses.push(e.response)
            }),
        )

        await bobClient.riverConnection.call(async (client) => {
            // from the client, to the channel, encrypted so that only the bot can read it
            return await client.sendInteractionResponse(
                channelId,
                recipient,
                interactionResponsePayload,
                encryptionDevice, // Use the decrypted encryption device from the request
            )
        })

        await waitFor(() => receivedInteractionResponses.length > 0)
        expect(receivedInteractionResponses[0].recipient).toEqual(recipient)
        expect(receivedInteractionResponses[0].payload.content.value?.requestId).toEqual(requestId)
    })

    it('user should NOT be able to send interaction request', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const interactionRequestContent: PlainMessage<InteractionRequestPayload['content']> = {
            case: 'signature',
            value: {
                id: randomUUID(),
                data: '0x1234567890',
                chainId: '1',
                type: InteractionRequestPayload_Signature_SignatureType.PERSONAL_SIGN,
            },
        }

        await bobClient.riverConnection.call(async (client) => {
            // Try to send an interaction request as a user (should fail)
            // Note: Even if we try to use the proper sendInteractionRequest method,
            // it should fail because only apps can send interaction requests
            await expect(
                client.sendInteractionRequest(channelId, interactionRequestContent),
            ).rejects.toThrow(/creator is not an app/)
        })
    })

    it('bot should be able to send form interaction request', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const interactionRequestContent: PlainMessage<InteractionRequestPayload['content']> = {
            case: 'form',
            value: {
                id: randomUUID(),
                components: [
                    { id: '1', component: { case: 'button', value: { label: 'Button' } } },
                    {
                        id: '2',
                        component: { case: 'textInput', value: { placeholder: 'Text Input' } },
                    },
                ],
            },
        }
        const { eventId } = await bot.sendInteractionRequest(channelId, interactionRequestContent)
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        const message = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
        expect(message).toBeDefined()
    })

    it('bot should be able to send signature interaction request using flattened API', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const requestId = randomUUID()
        const { eventId } = await bot.sendInteractionRequest(channelId, {
            type: 'signature',
            id: requestId,
            data: '0xabcdef1234567890',
            chainId: '8453',
            method: 'personal_sign',
            signerWallet: botClientAddress,
        })

        // Wait for Bob to receive the interaction request
        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        // Wait for decryption to complete
        await waitFor(() => {
            const event = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
            if (event?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
                return false
            }
            return event?.content?.payload !== undefined
        })

        const decryptedEvent = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === eventId,
        )
        expect(decryptedEvent?.content?.kind).toBe(RiverTimelineEvent.InteractionRequest)
        if (decryptedEvent?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
            throw new Error('Event is not an InteractionRequest')
        }

        const decryptedPayload = decryptedEvent.content.payload
        expect(decryptedPayload).toBeDefined()
        expect(decryptedPayload?.content.case).toBe('signature')
        if (decryptedPayload?.content.case === 'signature') {
            expect(decryptedPayload.content.value.id).toBe(requestId)
            expect(decryptedPayload.content.value.data).toBe('0xabcdef1234567890')
            expect(decryptedPayload.content.value.chainId).toBe('8453')
            expect(decryptedPayload.content.value.type).toBe(
                InteractionRequestPayload_Signature_SignatureType.PERSONAL_SIGN,
            )
        }
    })

    it('bot should be able to send form interaction request using flattened API', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const requestId = randomUUID()
        const { eventId } = await bot.sendInteractionRequest(channelId, {
            type: 'form',
            id: requestId,
            components: [
                { id: 'btn-1', type: 'button', label: 'Click Me' },
                { id: 'input-1', type: 'textInput', placeholder: 'Enter text here' },
            ],
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        // Wait for decryption to complete
        await waitFor(() => {
            const event = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
            if (event?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
                return false
            }
            return event?.content?.payload !== undefined
        })

        const decryptedEvent = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === eventId,
        )
        expect(decryptedEvent?.content?.kind).toBe(RiverTimelineEvent.InteractionRequest)
        if (decryptedEvent?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
            throw new Error('Event is not an InteractionRequest')
        }

        const decryptedPayload = decryptedEvent.content.payload
        expect(decryptedPayload).toBeDefined()
        expect(decryptedPayload?.content.case).toBe('form')
        if (decryptedPayload?.content.case === 'form') {
            expect(decryptedPayload.content.value.id).toBe(requestId)
            expect(decryptedPayload.content.value.components).toHaveLength(2)
            expect(decryptedPayload.content.value.components[0].id).toBe('btn-1')
            expect(decryptedPayload.content.value.components[0].component.case).toBe('button')
            expect(decryptedPayload.content.value.components[1].id).toBe('input-1')
            expect(decryptedPayload.content.value.components[1].component.case).toBe('textInput')
        }
    })

    it('bot should be able to send transaction interaction request using flattened API', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const requestId = randomUUID()
        const { eventId } = await bot.sendInteractionRequest(channelId, {
            type: 'transaction',
            id: requestId,
            title: 'Send USDC',
            subtitle: 'Send 50 USDC to recipient',
            tx: {
                chainId: '8453',
                to: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
                value: '0',
                data: '0xa9059cbb', // transfer function selector
                signerWallet: botClientAddress,
            },
        })

        await waitFor(() =>
            expect(
                bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId),
            ).toBeDefined(),
        )
        // Wait for decryption to complete
        await waitFor(() => {
            const event = bobDefaultChannel.timeline.events.value.find((x) => x.eventId === eventId)
            if (event?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
                return false
            }
            return event?.content?.payload !== undefined
        })

        const decryptedEvent = bobDefaultChannel.timeline.events.value.find(
            (x) => x.eventId === eventId,
        )
        expect(decryptedEvent?.content?.kind).toBe(RiverTimelineEvent.InteractionRequest)
        if (decryptedEvent?.content?.kind !== RiverTimelineEvent.InteractionRequest) {
            throw new Error('Event is not an InteractionRequest')
        }

        const decryptedPayload = decryptedEvent.content.payload
        expect(decryptedPayload).toBeDefined()
        expect(decryptedPayload?.content.case).toBe('transaction')
        if (decryptedPayload?.content.case === 'transaction') {
            expect(decryptedPayload.content.value.id).toBe(requestId)
            expect(decryptedPayload.content.value.title).toBe('Send USDC')
            expect(decryptedPayload.content.value.subtitle).toBe('Send 50 USDC to recipient')
            expect(decryptedPayload.content.value.content.case).toBe('evm')
            if (decryptedPayload.content.value.content.case === 'evm') {
                expect(decryptedPayload.content.value.content.value.chainId).toBe('8453')
                expect(decryptedPayload.content.value.content.value.to).toBe(
                    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
                )
                expect(decryptedPayload.content.value.content.value.value).toBe('0')
                expect(decryptedPayload.content.value.content.value.data).toBe('0xa9059cbb')
            }
        }
    })

    it('user should be able to send form interaction response', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_MENTIONS_REPLIES_REACTIONS)
        const recipient = bin_fromHexString(botClientAddress)
        const interactionResponsePayload: PlainMessage<InteractionResponsePayload> = {
            salt: genIdBlob(),
            content: {
                case: 'form',
                value: {
                    requestId: randomUUID(),
                    components: [
                        { id: '1', component: { case: 'button', value: {} } },
                        {
                            id: '2',
                            component: { case: 'textInput', value: { value: 'Text Input' } },
                        },
                    ],
                },
            },
        }
        const receivedInteractionResponses: Array<DecryptedInteractionResponse> = []
        subscriptions.push(
            bot.onInteractionResponse((_h, e) => {
                receivedInteractionResponses.push(e.response)
            }),
        )
        await bobClient.riverConnection.call(async (client) => {
            return await client.sendInteractionResponse(
                channelId,
                recipient,
                interactionResponsePayload,
                bot.getUserDevice(),
            )
        })
        await waitFor(() => receivedInteractionResponses.length > 0)
    })

    it('bot should be able to pin and unpin their own messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId, envelope } = await bot.sendMessage(channelId, 'Hello')
        const parsedEvnet = await bot.client.unpackEnvelope(envelope)
        const { eventId: pinEventId } = await bot.pinMessage(channelId, eventId, parsedEvnet.event)
        log('pinned event', pinEventId)
        const { eventId: unpinEventId } = await bot.unpinMessage(channelId, eventId)
        log('unpinned event', unpinEventId)
    })

    // @miguel-nascimento 2025-12-08 flaky test
    it.skip('bot should be able to pin and unpin other users messages', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const { eventId } = await bobDefaultChannel.sendMessage('Hello')
        const receivedMessages: OnMessageType[] = []
        subscriptions.push(
            bot.onMessage((_h, e) => {
                receivedMessages.push(e)
            }),
        )
        await waitFor(() => receivedMessages.length > 0)
        const message = receivedMessages.find((x) => x.eventId === eventId)
        check(isDefined(message), 'message is defined')
        expect(message).toBeDefined()
        expect(message?.event).toBeDefined()

        const { eventId: pinEventId } = await bot.pinMessage(channelId, eventId, message.event)
        log('pinned event', pinEventId)
        const { eventId: unpinEventId } = await bot.unpinMessage(channelId, eventId)
        log('unpinned event', unpinEventId)
    })

    it('bot can create role with permissions', async () => {
        // Create role directly on bot
        const { roleId } = await bot.createRole(spaceId, {
            name: 'Test Role',
            permissions: [Permission.Read, Permission.Write],
            users: [bot.botId, bob.userId],
        })
        // Verify role exists via spaceDapp
        const role = await spaceDapp.getRole(spaceId, roleId)
        expect(role).toBeDefined()
        expect(role?.name).toBe('Test Role')
        expect(role?.permissions).toContain(Permission.Read)
        expect(role?.permissions).toContain(Permission.Write)
    })

    it('bot can create role with NFT rule using Rules API', async () => {
        const testNft1Address = await TestERC721.getContractAddress('TestNFT1')

        const { roleId } = await bot.createRole(spaceId, {
            name: 'NFT Gated Role',
            permissions: [Permission.Read],
            rule: Rules.checkErc721({
                chainId: 31337n,
                contractAddress: testNft1Address,
                threshold: 1n,
            }),
        })

        const role = await spaceDapp.getRole(spaceId, roleId)
        expect(role).toBeDefined()
        expect(role?.name).toBe('NFT Gated Role')
        // Role should have rule data set
        expect(role?.ruleData).toBeDefined()
    })

    it('bot can update role', async () => {
        // Create role first
        const { roleId } = await bot.createRole(spaceId, {
            name: 'Original Name',
            permissions: [Permission.Read],
        })
        // Update the role
        await bot.updateRole(spaceId, roleId, {
            name: 'Updated Name',
            permissions: [Permission.Read, Permission.Write],
        })
        // Verify role was updated
        const role = await spaceDapp.getRole(spaceId, roleId)
        expect(role?.name).toBe('Updated Name')
        expect(role?.permissions).toContain(Permission.Write)
    })

    it('bot can add role to channel', async () => {
        // Create channel first (before the role exists)
        const newChannelId = await bot.createChannel(spaceId, {
            name: `test-channel-${randomUUID().slice(0, 8)}`,
            description: 'Test channel for role',
        })
        // Create role after channel exists
        const { roleId } = await bot.createRole(spaceId, {
            name: 'Channel Role',
            permissions: [Permission.Read],
        })
        // Add role to channel
        await bot.addRoleToChannel(newChannelId, roleId)
        // Verify role is in channel
        const channelRoles = await readContract(bot.viem, {
            address: SpaceAddressFromSpaceId(spaceId),
            abi: channelsFacetAbi,
            functionName: 'getRolesByChannel',
            args: [
                newChannelId.startsWith('0x')
                    ? (newChannelId as `0x${string}`)
                    : `0x${newChannelId}`,
            ],
        })
        expect(channelRoles).toContain(BigInt(roleId))
    })

    it('bot can get role details', async () => {
        const { roleId } = await bot.createRole(spaceId, {
            name: 'Detailed Role',
            permissions: [Permission.Read, Permission.Write],
        })
        const role = await bot.getRole(spaceId, roleId)
        expect(role).toBeDefined()
        expect(role?.name).toBe('Detailed Role')
        expect(role?.permissions).toContain(Permission.Read)
        expect(role?.permissions).toContain(Permission.Write)
    })

    it('bot can delete role', async () => {
        const { roleId } = await bot.createRole(spaceId, {
            name: 'Role To Delete',
            permissions: [Permission.Read],
        })
        // Verify role exists
        const roleBefore = await bot.getRole(spaceId, roleId)
        expect(roleBefore).toBeDefined()
        // Delete the role
        await bot.deleteRole(spaceId, roleId)
        // Verify role no longer exists
        const roleAfter = await bot.getRole(spaceId, roleId)
        expect(roleAfter).toBeNull()
    })

    it('bob (bot owner) should be able to update bot profile image', async () => {
        // Create mock chunked media info (following pattern from client.test.ts:1010-1047)
        const mediaStreamId = makeUniqueMediaStreamId()
        const image = create(MediaInfoSchema, {
            mimetype: 'image/png',
            filename: 'bot-avatar.png',
        })
        const { key, iv } = await deriveKeyAndIV(nanoid(128))
        const chunkedMediaInfo = {
            info: image,
            streamId: mediaStreamId,
            encryption: {
                case: 'aesgcm' as const,
                value: { secretKey: key, iv },
            },
            thumbnail: undefined,
        }

        // Bob (bot owner) updates the bot's profile image using setUserProfileImageFor
        await bobClient.riverConnection.call(async (client) => {
            await client.setUserProfileImage(chunkedMediaInfo, botClientAddress)
        })

        await waitFor(async () => {
            // Verify the bot's profile image was updated
            // in waitFor because sometimes it takes a second before you can getStream on a media stream
            const decrypted = await bobClient.riverConnection.call(async (client) => {
                return await client.getUserProfileImage(botClientAddress)
            })

            expect(decrypted).toBeDefined()
            expect(decrypted?.info?.mimetype).toBe('image/png')
            expect(decrypted?.info?.filename).toBe('bot-avatar.png')
        })
    })

    it('bot can be installed in DM channel', async () => {
        await setForwardSetting(ForwardSettingValue.FORWARD_SETTING_ALL_MESSAGES)
        const userOpHash = await bundlerClient.sendUserOperation({
            account: bobSmartAccount,
            calls: [
                {
                    to: appRegistryDapp.installer.address as `0x${string}`,
                    abi: IAppInstallerAbi,
                    functionName: 'installApp',
                    args: [appAddress, bobSmartAccount.address, '0x'],
                    value: parseEther('0.02'), // for the protocol fee
                },
            ],
        })
        const receipt = await bundlerClient.waitForUserOperationReceipt({
            hash: userOpHash,
        })
        expect(receipt.success).toBe(true)
        const receivedMessages: OnMessageType[] = []
        subscriptions.push(
            bot.onMessage((_h, e) => {
                if (e.isDm) {
                    receivedMessages.push(e)
                }
            }),
        )
        const { streamId } = await bobClient.dms.createDM(bot.botId, appAddress)
        const dm = bobClient.dms.getDm(streamId)
        const { eventId } = await dm.sendMessage('Hello')
        await waitFor(() => receivedMessages.length > 0, { timeoutMS: 15_000 })
        const message = receivedMessages.find((x) => x.eventId === eventId)
        expect(message).toBeDefined()
    })
})
