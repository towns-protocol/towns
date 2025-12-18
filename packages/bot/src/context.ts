import type {
    PlainMessage,
    Tags,
    StreamEvent,
    InteractionRequestPayload,
    ChannelMessage_Post_Mention,
} from '@towns-protocol/proto'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Permission } from '@towns-protocol/web3'
import type { WalletClient, Transport, Chain, Account, Address } from 'viem'
import type { ClientV2, ParsedEvent } from '@towns-protocol/sdk'
import type {
    PostMessageOpts,
    MessageOpts,
    CreateChannelParams,
    CreateRoleParams,
    DecryptedInteractionResponse,
    InferInput,
    BotActions,
    BasePayload,
} from './bot'

// Event-specific data types
export type MessageEventData = {
    /** The decrypted message content */
    message: string
    /** In case of a reply, that's the eventId of the message that got replied */
    replyId: string | undefined
    /** In case of a thread, that's the thread id where the message belongs to */
    threadId: string | undefined
    /** Users mentioned in the message */
    mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
    /** Convenience flag to check if the bot was mentioned */
    isMentioned: boolean
}

export type SlashCommandEventData = {
    /** The slash command that was invoked (without the /) */
    command: string
    /** Arguments passed after the command */
    args: string[]
    /** Users mentioned in the command */
    mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
    /** The eventId of the message that got replied */
    replyId: string | undefined
    /** The thread id where the message belongs to */
    threadId: string | undefined
}

export type ReactionEventData = {
    /** The reaction that was added */
    reaction: string
    /** The event ID of the message that got reacted to */
    messageId: string
}

export type RedactionEventData = {
    /** The event ID that got redacted */
    refEventId: string
}

export type MessageEditEventData = {
    /** The event ID of the message that got edited */
    refEventId: string
    /** New message */
    message: string
    /** In case of a reply, that's the eventId of the message that got replied */
    replyId: string | undefined
    /** In case of a thread, that's the thread id where the message belongs to */
    threadId: string | undefined
    /** Users mentioned in the message */
    mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
    /** Convenience flag to check if the bot was mentioned */
    isMentioned: boolean
}

export type TipEventData = {
    /** The message ID of the parent of the tip */
    messageId: string
    /** The address that sent the tip */
    senderAddress: Address
    /** The address that received the tip */
    receiverAddress: Address
    /** The user ID that received the tip */
    receiverUserId: string
    /** The amount of the tip */
    amount: bigint
    /** The currency of the tip */
    currency: Address
}

export type StreamEventData = {
    /** The parsed event */
    parsed: ParsedEvent
}

export type InteractionResponseEventData = {
    /** The interaction response that was received */
    response: DecryptedInteractionResponse
    threadId: string | undefined
}

export type RawGmEventData = {
    typeUrl: string
    message: Uint8Array
}

export type GmEventData<Schema extends StandardSchemaV1> = {
    typeUrl: string
    schema: Schema
    data: InferInput<Schema>
}

export type MessageContext = Context<BasePayload & MessageEventData>
export type SlashCommandContext<CommandName extends string = string> = Context<
    BasePayload & SlashCommandEventData & { command: CommandName }
>
export type ReactionContext = Context<BasePayload & ReactionEventData>
export type RedactionContext = Context<BasePayload & RedactionEventData>
export type MessageEditContext = Context<BasePayload & MessageEditEventData>
export type TipContext = Context<BasePayload & TipEventData>
export type StreamEventContext = Context<BasePayload & StreamEventData>
export type InteractionResponseContext = Context<BasePayload & InteractionResponseEventData>
export type RawGmContext = Context<BasePayload & RawGmEventData>
export type GmContext<Schema extends StandardSchemaV1> = Context<BasePayload & GmEventData<Schema>>

/**
 * Context class that provides per-handler state and actions.
 * Each event handler receives a fresh Context instance with:
 * - Event data (userId, channelId, spaceId, etc.)
 * - Event-specific data (message, command, reaction, etc.)
 * - Message tags for threading
 * - Action methods (sendMessage, reply, react, etc.)
 * - viem client and appAddress for Web3 operations
 */
export class Context<TEventData extends BasePayload = BasePayload> {
    readonly userId: Address
    readonly spaceId: string
    readonly channelId: string
    readonly eventId: string
    readonly createdAt: Date
    readonly event: StreamEvent
    // The raw request from app registry that triggered the event
    readonly req: Request

    // Per-context instances for Web3 operations
    readonly viem: WalletClient<Transport, Chain, Account>
    readonly appAddress: Address

    // Private: message tags for threading
    private readonly tags: PlainMessage<Tags> | undefined

    // Private: client for delegating actions
    private readonly client: ClientV2<BotActions>

    // Private: bot for getStreamView
    private readonly getStreamViewFn: (streamId: string) => Promise<unknown>

    constructor(params: {
        payload: TEventData
        tags: PlainMessage<Tags> | undefined
        client: ClientV2<BotActions>
        viem: WalletClient<Transport, Chain, Account>
        appAddress: Address
        getStreamViewFn: (streamId: string) => Promise<unknown>
        // req: Request
    }) {
        // Base payload fields
        this.userId = params.payload.userId
        this.spaceId = params.payload.spaceId
        this.channelId = params.payload.channelId
        this.eventId = params.payload.eventId
        this.createdAt = params.payload.createdAt
        this.event = params.payload.event
        // Spread event-specific data onto the instance
        Object.assign(this, params.payload)

        this.tags = params.tags
        this.client = params.client
        this.viem = params.viem
        this.appAddress = params.appAddress
        this.getStreamViewFn = params.getStreamViewFn
        // this.req = params.req
        this.req = new Request('https://example.com')
    }

    // === Convenience Methods ===

    /**
     * Send a message to the current channel
     * @param message - The message text
     * @param opts - Optional message options
     */
    async send(message: string, opts?: PostMessageOpts) {
        return this.sendMessage(this.channelId, message, opts)
    }

    /**
     * Reply to the current event
     * @param message - The reply message text
     * @param opts - Optional message options (replyId is auto-filled)
     */
    async reply(message: string, opts?: Omit<PostMessageOpts, 'replyId'>) {
        return this.sendMessage(this.channelId, message, { ...opts, replyId: this.eventId })
    }

    /**
     * React to the current event with an emoji
     * @param reaction - The emoji reaction
     */
    async react(reaction: string) {
        return this.sendReaction(this.channelId, this.eventId, reaction)
    }

    // === All BotActions methods (delegate to client with tags) ===

    /**
     * Send a message to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param message - The cleartext of the message
     * @param opts - The options for the message
     */
    async sendMessage(streamId: string, message: string, opts?: PostMessageOpts) {
        return this.client.sendMessage(streamId, message, opts, this.tags)
    }

    /**
     * Edit a specific message from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param messageId - The eventId of the message to edit
     * @param message - The new message text
     * @param opts - Optional message options
     */
    async editMessage(
        streamId: string,
        messageId: string,
        message: string,
        opts?: PostMessageOpts,
    ) {
        return this.client.editMessage(streamId, messageId, message, opts, this.tags)
    }

    /**
     * Send a reaction to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to react to
     * @param reaction - The reaction to send
     */
    async sendReaction(streamId: string, refEventId: string, reaction: string) {
        return this.client.sendReaction(streamId, refEventId, reaction, this.tags)
    }

    /**
     * Remove a specific event from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async removeEvent(streamId: string, refEventId: string) {
        return this.client.removeEvent(streamId, refEventId, this.tags)
    }

    /**
     * Remove a specific event from a stream as an admin. This is only available if you have Permission.Redact
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async adminRemoveEvent(streamId: string, refEventId: string) {
        return this.client.adminRemoveEvent(streamId, refEventId)
    }

    /**
     * Send a GM (generic message) to a stream with schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param schema - StandardSchema for validation
     * @param data - Data to validate and send
     * @param opts - Optional message options
     */
    async sendGM<Schema extends StandardSchemaV1>(
        streamId: string,
        typeUrl: string,
        schema: Schema,
        data: InferInput<Schema>,
        opts?: MessageOpts,
    ) {
        return this.client.sendGM(streamId, typeUrl, schema, data, opts, this.tags)
    }

    /**
     * Send a raw GM (generic message) to a stream without schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param message - Optional raw message data as bytes
     * @param opts - The options for the message
     */
    async sendRawGM(streamId: string, typeUrl: string, message: Uint8Array, opts?: MessageOpts) {
        return this.client.sendRawGM(streamId, typeUrl, message, opts, this.tags)
    }

    /**
     * Send an interaction request to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param content - The interaction request content
     * @param recipient - Optional recipient user bytes
     * @param opts - The options for the interaction request
     */
    async sendInteractionRequest(
        streamId: string,
        content: PlainMessage<InteractionRequestPayload['content']>,
        recipient?: Uint8Array,
        opts?: MessageOpts,
    ) {
        return this.client.sendInteractionRequest(streamId, content, recipient, opts, this.tags)
    }

    /**
     * Send a tip to a user by looking up their smart account
     * @param params - Tip parameters including userId, amount, messageId, channelId, currency
     */
    async sendTip(params: {
        currency?: Address
        userId: Address
        amount: bigint
        messageId: string
        channelId: string
    }) {
        return this.client.sendTip(params, this.tags)
    }

    /**
     * Check if a user has admin permission in a space
     * @param userId - The userId of the user to check
     * @param spaceId - The spaceId of the space
     */
    async hasAdminPermission(userId: string, spaceId: string) {
        return this.client.hasAdminPermission(userId, spaceId)
    }

    /**
     * Check if a user has a specific permission
     * @param streamId - The stream ID (channel or space)
     * @param userId - The user ID to check
     * @param permission - The permission to check
     */
    async checkPermission(streamId: string, userId: string, permission: Permission) {
        return this.client.checkPermission(streamId, userId, permission)
    }

    /**
     * Ban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to ban
     * @param spaceId - The spaceId of the space to ban the user in
     */
    async ban(userId: string, spaceId: string) {
        return this.client.ban(userId, spaceId)
    }

    /**
     * Unban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to unban
     * @param spaceId - The spaceId of the space to unban the user in
     */
    async unban(userId: string, spaceId: string) {
        return this.client.unban(userId, spaceId)
    }

    /**
     * Pin a message to a stream
     * @param streamId - The stream ID to pin the message to
     * @param eventId - The event ID of the message to pin
     * @param streamEvent - The stream event to pin
     */
    async pinMessage(streamId: string, eventId: string, streamEvent: StreamEvent) {
        return this.client.pinMessage(streamId, eventId, streamEvent)
    }

    /**
     * Unpin a message from a stream
     * @param streamId - The stream ID to unpin the message from
     * @param eventId - The event ID of the message to unpin
     */
    async unpinMessage(streamId: string, eventId: string) {
        return this.client.unpinMessage(streamId, eventId)
    }

    /**
     * Create a channel in a space
     * All users with Permission.Read will be able to join the channel.
     * @param spaceId - The space ID to create the channel in
     * @param params - The parameters for the channel creation
     */
    async createChannel(spaceId: string, params: CreateChannelParams) {
        return this.client.createChannel(spaceId, params)
    }

    /**
     * Get all roles for a space
     * @param spaceId - The space ID to get the roles for
     */
    async getAllRoles(spaceId: string) {
        return this.client.getAllRoles(spaceId)
    }

    /**
     * Create a role in a space
     * @param spaceId - The space ID
     * @param params - Role parameters (name, permissions, optional rule, optional users)
     */
    async createRole(spaceId: string, params: CreateRoleParams) {
        return this.client.createRole(spaceId, params)
    }

    /**
     * Update an existing role
     * @param spaceId - The space ID
     * @param roleId - The role ID to update
     * @param params - Updated role parameters
     */
    async updateRole(spaceId: string, roleId: number, params: CreateRoleParams) {
        return this.client.updateRole(spaceId, roleId, params)
    }

    /**
     * Add a role to a channel
     * @param channelId - The channel ID
     * @param roleId - The role ID to add
     */
    async addRoleToChannel(channelId: string, roleId: number) {
        return this.client.addRoleToChannel(channelId, roleId)
    }

    /**
     * Delete a role from a space
     * @param spaceId - The space ID
     * @param roleId - The role ID to delete
     */
    async deleteRole(spaceId: string, roleId: number) {
        return this.client.deleteRole(spaceId, roleId)
    }

    /**
     * Get full details of a specific role
     * @param spaceId - The space ID
     * @param roleId - The role ID
     */
    async getRole(spaceId: string, roleId: number) {
        return this.client.getRole(spaceId, roleId)
    }

    /**
     * Get the stream view for a stream
     * Stream views contain contextual information about the stream (space, channel, etc)
     * @param streamId - The stream ID to get the view for
     */
    async getStreamView(streamId: string) {
        return this.getStreamViewFn(streamId)
    }
}
