import { create, fromBinary, toBinary } from '@bufbuild/protobuf'
import { ethers } from 'ethers'
import { SpaceDapp, type SendTipMemberParams } from '@towns-protocol/web3'
import type { StandardSchemaV1 } from '@standard-schema/spec'

import {
    createTownsClient,
    type ClientV2,
    townsEnv,
    parseAppPrivateData,
    type CreateTownsClientParams,
} from '@towns-protocol/sdk'
import { type Context, type Env, type Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { default as jwt } from 'jsonwebtoken'
import { createNanoEvents, type Emitter } from 'nanoevents'
import {
    AppServiceRequestSchema,
    AppServiceResponseSchema,
    type AppServiceResponse,
    type PlainMessage,
    Tags,
    type SlashCommand,
    type AppMetadata,
    type InteractionRequestPayload,
} from '@towns-protocol/proto'
import { bin_fromBase64, bin_fromHexString, bin_toHexString, dlog } from '@towns-protocol/utils'

import {
    http,
    type Chain,
    type Transport,
    type Hex,
    type Address,
    type Account,
    type WalletClient,
    createWalletClient,
} from 'viem'
import { readContract } from 'viem/actions'
import { base, baseSepolia, foundry } from 'viem/chains'
import type { BlankEnv } from 'hono/types'
import packageJson from '../package.json' with { type: 'json' }
import { privateKeyToAccount } from 'viem/accounts'
import appRegistryAbi from '@towns-protocol/generated/dev/abis/IAppRegistry.abi'
import type { BotIdentityConfig, BotIdentityMetadata, ERC8004Endpoint } from './identity-types'
import { buildBotActions, type BotActions } from './actions'
import { handleEvent as dispatchEvent, type BotEvents, type BasePayload } from './event-dispatcher'
import type { InferInput, InferOutput } from './actions/interaction'
import type { MessageOpts, PostMessageOpts } from './actions/message'
import type { PinMessageParams, UnpinMessageParams } from './actions/pinning'
import type { CreateChannelActionParams, GetRolesParams } from './actions/channel'
import type { AdminRemoveEventParams, BanParams, UnbanParams } from './actions/moderation'
import type { HasAdminPermissionParams } from './actions/permissions'

export type BotHandler = BotActions
export type { BotActions }

const debug = dlog('csb:bot')

export const makeTownsBot = async <
    Commands extends PlainMessage<SlashCommand>[] = [],
    HonoEnv extends Env = BlankEnv,
>(
    appPrivateData: string,
    jwtSecretBase64: string,
    opts: {
        baseRpcUrl?: string
        commands?: Commands
        identity?: BotIdentityConfig
    } & Partial<Omit<CreateTownsClientParams, 'env' | 'encryptionDevice'>> = {},
) => {
    const { baseRpcUrl, ...clientOpts } = opts
    let appAddress: Address | undefined
    const {
        privateKey,
        encryptionDevice,
        env,
        appAddress: appAddressFromPrivateData,
    } = parseAppPrivateData(appPrivateData)
    if (!env) {
        throw new Error('Failed to parse APP_PRIVATE_DATA')
    }
    if (appAddressFromPrivateData) {
        appAddress = appAddressFromPrivateData
    }
    const account = privateKeyToAccount(privateKey as Hex)

    const baseConfig = townsEnv().makeBaseChainConfig(env)
    const getChain = (chainId: number) => {
        if (chainId === base.id) return base
        if (chainId === foundry.id) return foundry
        return baseSepolia
    }
    const chain = getChain(baseConfig.chainConfig.chainId)
    const viem = createWalletClient({
        account,
        transport: baseRpcUrl
            ? http(baseRpcUrl, { batch: true })
            : http(baseConfig.rpcUrl, { batch: true }),
        chain,
    })

    const spaceDapp = new SpaceDapp(
        baseConfig.chainConfig,
        new ethers.providers.JsonRpcProvider(baseRpcUrl || baseConfig.rpcUrl),
    )
    if (!appAddress) {
        appAddress = await readContract(viem, {
            address: baseConfig.chainConfig.addresses.appRegistry,
            abi: appRegistryAbi,
            functionName: 'getAppByClient',
            args: [account.address],
        })
    }

    const client = await createTownsClient({
        privateKey,
        env,
        encryptionDevice: {
            fromExportedDevice: encryptionDevice,
        },
        ...clientOpts,
    }).then((x) =>
        x.extend((townsClient) => buildBotActions(townsClient, viem, spaceDapp, appAddress)),
    )

    if (opts.commands) {
        client
            .appServiceClient()
            .then((appRegistryClient) =>
                appRegistryClient
                    .updateAppMetadata({
                        appId: bin_fromHexString(account.address),
                        updateMask: ['slash_commands'],
                        metadata: {
                            slashCommands: opts.commands,
                        },
                    })
                    .catch((err) => {
                        // eslint-disable-next-line no-console
                        console.warn('[@towns-protocol/bot] failed to update slash commands', err)
                    }),
            )
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[@towns-protocol/bot] failed to get app registry rpc client', err)
            })
    }

    await client.uploadDeviceKeys()
    return new Bot<Commands, HonoEnv>(
        client,
        viem,
        jwtSecretBase64,
        appAddress,
        opts.commands,
        opts.identity,
    )
}

export class Bot<
    Commands extends PlainMessage<SlashCommand>[] = [],
    HonoEnv extends Env = BlankEnv,
> {
    readonly client: ClientV2<BotActions>
    readonly appAddress: Address
    botId: string
    viem: WalletClient<Transport, Chain, Account>
    private readonly jwtSecret: Uint8Array
    private currentMessageTags: PlainMessage<Tags> | undefined
    private readonly emitter: Emitter<BotEvents<Commands>> = createNanoEvents()
    private readonly slashCommandHandlers: Map<string, BotEvents<Commands>['slashCommand']> =
        new Map()
    private readonly gmTypedHandlers: Map<
        string,
        {
            schema: StandardSchemaV1
            handler: (
                handler: BotActions,
                event: BasePayload & { typeUrl: string; data: any },
            ) => void | Promise<void>
        }
    > = new Map()
    private readonly commands: Commands | undefined
    private readonly identityConfig?: BotIdentityConfig

    constructor(
        clientV2: ClientV2<BotActions>,
        viem: WalletClient<Transport, Chain, Account>,
        jwtSecretBase64: string,
        appAddress: Address,
        commands?: Commands,
        identityConfig?: BotIdentityConfig,
    ) {
        this.client = clientV2
        this.botId = clientV2.userId
        this.viem = viem
        this.jwtSecret = bin_fromBase64(jwtSecretBase64)
        this.currentMessageTags = undefined
        this.commands = commands
        this.appAddress = appAddress
        this.identityConfig = identityConfig
    }

    start() {
        const jwtMiddleware = createMiddleware<HonoEnv>(this.jwtMiddleware.bind(this))

        debug('start')

        return {
            jwtMiddleware,
            handler: this.webhookHandler.bind(this),
        }
    }

    private async jwtMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
        const authHeader = c.req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.text('Unauthorized: Missing or malformed token', 401)
        }

        const tokenString = authHeader.substring(7)
        try {
            const botAddressBytes = bin_fromHexString(this.botId)
            const expectedAudience = bin_toHexString(botAddressBytes)
            jwt.verify(tokenString, Buffer.from(this.jwtSecret), {
                algorithms: ['HS256'],
                audience: expectedAudience,
            })
        } catch (err) {
            let errorMessage = 'Unauthorized: Token verification failed'
            if (err instanceof jwt.TokenExpiredError) {
                errorMessage = 'Unauthorized: Token expired'
            } else if (err instanceof jwt.JsonWebTokenError) {
                errorMessage = `Unauthorized: Invalid token (${err.message})`
            }
            return c.text(errorMessage, 401)
        }

        await next()
    }

    private async webhookHandler(c: Context<HonoEnv>) {
        const body = await c.req.arrayBuffer()
        const encryptionDevice = this.getUserDevice()
        const request = fromBinary(AppServiceRequestSchema, new Uint8Array(body))
        debug('webhook', request)
        const statusResponse = create(AppServiceResponseSchema, {
            payload: {
                case: 'status',
                value: {
                    frameworkVersion: 1,
                    clientVersion: `javascript:${packageJson.name}:${packageJson.version}`,
                    deviceKey: encryptionDevice.deviceKey,
                    fallbackKey: encryptionDevice.fallbackKey,
                },
            },
        })
        let response: AppServiceResponse = statusResponse
        if (request.payload.case === 'initialize') {
            response = create(AppServiceResponseSchema, {
                payload: {
                    case: 'initialize',
                    value: {
                        encryptionDevice,
                    },
                },
            })
        } else if (request.payload.case === 'events') {
            for (const event of request.payload.value.events) {
                try {
                    await dispatchEvent(
                        {
                            client: this.client,
                            botId: this.botId,
                            emitter: this.emitter,
                            slashCommandHandlers: this.slashCommandHandlers,
                            gmTypedHandlers: this.gmTypedHandlers,
                            currentMessageTags: this.currentMessageTags,
                            userDevice: this.getUserDevice(),
                        },
                        event,
                    )
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[@towns-protocol/bot] Error while handling event', err)
                }
            }
            response = statusResponse
        } else if (request.payload.case === 'status') {
            response = statusResponse
        }

        c.header('Content-Type', 'application/x-protobuf')
        return c.body(toBinary(AppServiceResponseSchema, response), 200)
    }

    /**
     * get the public device key of the bot
     * @returns the public device key of the bot
     */
    getUserDevice() {
        return this.client.crypto.getUserDevice()
    }

    /**
     * Send a message to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param message - The cleartext of the message
     * @param opts - The options for the message
     */
    async sendMessage(streamId: string, message: string, opts?: PostMessageOpts) {
        const tags = this.currentMessageTags
        this.currentMessageTags = undefined
        return this.client.sendMessage(streamId, message, opts, tags)
    }

    /**
     * Send a reaction to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to react to
     * @param reaction - The reaction to send
     */
    async sendReaction(streamId: string, refEventId: string, reaction: string) {
        const result = await this.client.sendReaction(
            streamId,
            refEventId,
            reaction,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Remove an specific event from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async removeEvent(streamId: string, refEventId: string) {
        const result = await this.client.removeEvent(streamId, refEventId, this.currentMessageTags)
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Remove an specific event from a stream as an admin. This is only available if you have Permission.Redact
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async adminRemoveEvent(...params: AdminRemoveEventParams) {
        return this.client.adminRemoveEvent(...params)
    }

    /**
     * Edit an specific message from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param messageId - The eventId of the message to edit
     * @param message - The new message text
     */
    async editMessage(
        streamId: string,
        messageId: string,
        message: string,
        opts?: PostMessageOpts,
    ) {
        const result = await this.client.editMessage(
            streamId,
            messageId,
            message,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send a GM (generic message) to a stream with schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param schema - StandardSchema for validation
     * @param data - Data to validate and send
     */
    async sendGM<Schema extends StandardSchemaV1>(
        streamId: string,
        typeUrl: string,
        schema: Schema,
        data: InferInput<Schema>,
        opts?: MessageOpts,
    ) {
        const result = await this.client.sendGM(
            streamId,
            typeUrl,
            schema,
            data,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send a raw GM (generic message) to a stream without schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param message - Optional raw message data as bytes
     * @param opts - The options for the message
     */
    async sendRawGM(streamId: string, typeUrl: string, message: Uint8Array, opts?: MessageOpts) {
        const result = await this.client.sendRawGM(
            streamId,
            typeUrl,
            message,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send an interaction request to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param request - The interaction request to send
     * @param opts - The options for the interaction request
     * @returns The eventId of the interaction request
     */
    async sendInteractionRequest(
        streamId: string,
        content: PlainMessage<InteractionRequestPayload['content']>,
        recipient?: Uint8Array,
        opts?: MessageOpts,
    ) {
        const result = await this.client.sendInteractionRequest(
            streamId,
            content,
            recipient,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    async hasAdminPermission(params: HasAdminPermissionParams) {
        const result = await this.client.hasAdminPermission(...params)
        return result
    }

    /**
     * Ban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to ban
     * @param spaceId - The spaceId of the space to ban the user in
     */
    async ban(params: BanParams) {
        const result = await this.client.ban(...params)
        return result
    }

    /**
     * Unban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to unban
     * @param spaceId - The spaceId of the space to unban the user in
     */
    async unban(params: UnbanParams) {
        const result = await this.client.unban(...params)
        return result
    }

    /** Sends a tip to a user by looking up their smart account.
     *  Tip will always get funds from the app account balance.
     * @param params - Tip parameters including userId, amount, messageId, channelId, currency.
     * @returns The transaction hash and event ID
     */
    async sendTip(
        params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency' | 'receiver'> & {
            currency?: Address
            userId: Address
        },
    ) {
        const result = await this.client.sendTip(params, this.currentMessageTags)
        this.currentMessageTags = undefined
        return result
    }

    async pinMessage(...params: PinMessageParams) {
        return this.client.pinMessage(...params)
    }

    async unpinMessage(...params: UnpinMessageParams) {
        return this.client.unpinMessage(...params)
    }

    /**
     * Create a channel in a space
     * All users with Permission.Read will be able to join the channel.
     * @param spaceId - The space ID to create the channel in
     * @param params - The parameters for the channel creation
     * @returns The channel ID
     */
    async createChannel(...params: CreateChannelActionParams) {
        return this.client.createChannel(...params)
    }

    /**
     * Get the roles for a space
     * @param spaceId - The space ID to get the roles for
     * @returns The roles
     */
    async getRoles(...params: GetRolesParams) {
        return this.client.getRoles(...params)
    }

    /**
     * Triggered when someone sends a message.
     * This is triggered for all messages, including direct messages and group messages.
     */
    onMessage(fn: BotEvents['message']) {
        return this.emitter.on('message', fn)
    }

    onRedaction(fn: BotEvents['redaction']) {
        return this.emitter.on('redaction', fn)
    }

    /**
     * Triggered when a message gets edited
     */
    onMessageEdit(fn: BotEvents['messageEdit']) {
        return this.emitter.on('messageEdit', fn)
    }

    /**
     * Triggered when someone reacts to a message
     */
    onReaction(fn: BotEvents['reaction']) {
        return this.emitter.on('reaction', fn)
    }

    /**
     * Triggered when a message is revoked by a moderator
     */
    onEventRevoke(fn: BotEvents['eventRevoke']) {
        return this.emitter.on('eventRevoke', fn)
    }

    /**
     * Triggered when someone tips the bot
     */
    onTip(fn: BotEvents['tip']) {
        return this.emitter.on('tip', fn)
    }

    /**
     * Triggered when someone joins a channel
     */
    onChannelJoin(fn: BotEvents['channelJoin']) {
        return this.emitter.on('channelJoin', fn)
    }

    /**
     * Triggered when someone leaves a channel
     */
    onChannelLeave(fn: BotEvents['channelLeave']) {
        return this.emitter.on('channelLeave', fn)
    }

    onStreamEvent(fn: BotEvents['streamEvent']) {
        return this.emitter.on('streamEvent', fn)
    }

    onSlashCommand(command: Commands[number]['name'], fn: BotEvents<Commands>['slashCommand']) {
        this.slashCommandHandlers.set(command, fn)
        const unset = () => {
            if (
                this.slashCommandHandlers.has(command) &&
                this.slashCommandHandlers.get(command) === fn
            ) {
                this.slashCommandHandlers.delete(command)
            }
        }
        return unset
    }

    /**
     * Triggered when someone sends a GM (generic message) with type validation using StandardSchema
     * @param typeUrl - The type URL to listen for
     * @param schema - The StandardSchema to validate the message data
     * @param handler - The handler function to call when a message is received
     */
    onGmMessage<Schema extends StandardSchemaV1>(
        typeUrl: string,
        schema: Schema,
        handler: (
            handler: BotActions,
            event: BasePayload & { typeUrl: string; data: InferOutput<Schema> },
        ) => void | Promise<void>,
    ) {
        this.gmTypedHandlers.set(typeUrl, { schema, handler: handler as any })
        const unset = () => {
            if (
                this.gmTypedHandlers.has(typeUrl) &&
                this.gmTypedHandlers.get(typeUrl)?.handler === handler
            ) {
                this.gmTypedHandlers.delete(typeUrl)
            }
        }
        return unset
    }

    onRawGmMessage(handler: BotEvents['rawGmMessage']) {
        return this.emitter.on('rawGmMessage', handler)
    }

    /**
     * Triggered when someone sends an interaction response
     * @param fn - The handler function to call when an interaction response is received
     */
    onInteractionResponse(fn: BotEvents['interactionResponse']) {
        return this.emitter.on('interactionResponse', fn)
    }

    /**
     * Get the stream view for a stream
     * Stream views contain contextual information about the stream (space, channel, etc)
     * Stream views contain member data for all streams - you can iterate over all members in a channel via: `streamView.getMembers().joined.keys()`
     * note: potentially expensive operation because streams can be large, fine to use in small streams
     * @param streamId - The stream ID to get the view for
     * @returns The stream view
     */
    async getStreamView(streamId: string) {
        return this.client.getStream(streamId)
    }

    /**
     * Get the ERC-8004 compliant metadata JSON
     * This should be hosted at /.well-known/agent-metadata.json
     * Fetches metadata from the App Registry and merges with local config
     * @returns The ERC-8004 compliant metadata object or null
     */
    async getIdentityMetadata(): Promise<BotIdentityMetadata | null> {
        // Fetch metadata from App Registry
        let appMetadata: PlainMessage<AppMetadata> | undefined
        try {
            const appRegistry = await this.client.appServiceClient()
            const response = await appRegistry.getAppMetadata({
                appId: bin_fromHexString(this.botId),
            })
            appMetadata = response.metadata
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[@towns-protocol/bot] Failed to fetch app metadata', err)
        }

        // If no config and no fetched metadata, return null
        if (!this.identityConfig && !appMetadata) return null

        const endpoints: ERC8004Endpoint[] = []

        if (this.identityConfig?.endpoints) {
            endpoints.push(...this.identityConfig.endpoints)
        }

        const hasAgentWallet = endpoints.some((e) => e.name === 'agentWallet')
        if (!hasAgentWallet) {
            const chainId = this.viem.chain.id
            endpoints.push({
                name: 'agentWallet',
                endpoint: `eip155:${chainId}:${this.appAddress}`,
            })
        }

        const domain = this.identityConfig?.domain
        if (domain && !endpoints.some((e) => e.name === 'A2A')) {
            const origin = domain.startsWith('http') ? domain : `https://${domain}`

            endpoints.push({
                name: 'A2A',
                endpoint: `${origin}/.well-known/agent-card.json`,
                version: '0.3.0',
            })
        }

        // Merge app metadata with identity config, preferring identity config
        const name = this.identityConfig?.name || appMetadata?.displayName || 'Unknown Bot'
        const description = this.identityConfig?.description || appMetadata?.description || ''
        const image =
            this.identityConfig?.image || appMetadata?.avatarUrl || appMetadata?.imageUrl || ''
        const motto = this.identityConfig?.motto || appMetadata?.motto

        return {
            type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
            name,
            description,
            image,
            endpoints,
            registrations: this.identityConfig?.registrations || [],
            supportedTrust: this.identityConfig?.supportedTrust,
            motto,
            capabilities: this.commands?.map((c) => c.name) || [],
            version: packageJson.version,
            framework: `javascript:${packageJson.name}:${packageJson.version}`,
            attributes: this.identityConfig?.attributes,
        }
    }

    /**
     * Get the tokenURI that would be used for ERC-8004 registration
     * Returns null if no domain is configured
     * @returns The .well-known URL or null
     */
    getTokenURI(): string | null {
        if (!this.identityConfig?.domain) return null

        const origin = this.identityConfig.domain.startsWith('http')
            ? this.identityConfig.domain
            : `https://${this.identityConfig.domain}`

        return `${origin}/.well-known/agent-metadata.json`
    }
}
