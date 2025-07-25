import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'
import {
    ChannelMessage_Post_Attachment,
    ChannelMessage_Post_Mention,
    PlainMessage,
} from '@towns-protocol/proto'
import { MessageTimeline } from '../../timeline/timeline'
import { check, dlogger } from '@towns-protocol/dlog'
import { isDefined } from '../../../check'
import { ChannelDetails, SpaceDapp } from '@towns-protocol/web3'
import { Members } from '../../members/members'
import type { ethers } from 'ethers'

const logger = dlogger('csb:channel')

export interface ChannelModel extends Identifiable {
    /** The River `channelId` of the channel. */
    id: string
    /** The River `spaceId` which this channel belongs. */
    spaceId: string
    /** Whether the SyncAgent has joined this channel. */
    isJoined: boolean
    /** The channel metadata {@link ChannelDetails}. */
    metadata?: ChannelDetails
}

@persistedObservable({ tableName: 'channel' })
export class Channel extends PersistedObservable<ChannelModel> {
    timeline: MessageTimeline
    members: Members
    constructor(
        id: string,
        spaceId: string,
        private riverConnection: RiverConnection,
        private spaceDapp: SpaceDapp,
        store: Store,
    ) {
        super({ id, spaceId, isJoined: false }, store, LoadPriority.high)
        this.timeline = new MessageTimeline(id, riverConnection.userId, riverConnection)
        this.members = new Members(id, riverConnection, store)
    }

    protected override onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on('streamNewUserJoined', this.onStreamUserJoined)
            client.on('streamUserLeft', this.onStreamUserLeft)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamNewUserJoined', this.onStreamUserJoined)
                client.off('streamUserLeft', this.onStreamUserLeft)
            }
        })

        if (!this.data.metadata) {
            // todo aellis this needs batching and retries, and should be updated on spaceChannelUpdated events
            this.spaceDapp
                .getChannelDetails(this.data.spaceId, this.data.id)
                .then((metadata) => {
                    if (metadata) {
                        this.setData({ metadata })
                    }
                })
                .catch((error) => {
                    logger.error('failed to get channel details', { id: this.data.id, error })
                })
        }
    }

    /** Joins the channel. */
    async join() {
        const channelId = this.data.id
        await this.riverConnection.call(async (client) => {
            await client.joinStream(channelId)
        })
    }

    /** Sends a message to the channel.
     * @param message - The message to send.
     * @param options - Additional options for the message.
     * @returns The event id of the message.
     */
    async sendMessage(
        message: string,
        options?: {
            /** If set, this message will be linked to a thread with the specified message. */
            threadId?: string
            /** If set, this message will be linked as a reply to the specified message. */
            replyId?: string
            // TODO: would be great to improve the usability here. Its not that ergonomic to pass the `ChannelMessage_Post_Mention` payload itself
            // and its a bit unclear about what are the intetion of the fields.
            /** The users that are mentioned in the message */
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            /** The attachments in the message. You can attach images, videos, links, files, or even other messages. */
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
    ): Promise<{ eventId: string }> {
        const channelId = this.data.id
        const result = await this.riverConnection.withStream(channelId).call((client) => {
            return client.sendChannelMessage_Text(channelId, {
                threadId: options?.threadId,
                threadPreview: options?.threadId ? '🙉' : undefined,
                replyId: options?.replyId,
                replyPreview: options?.replyId ? '🙈' : undefined,
                content: {
                    body: message,
                    mentions: options?.mentions ?? [],
                    attachments: options?.attachments ?? [],
                },
            })
        })
        return result
    }

    /** Edits a message in the channel.
     * @param eventId - The event id of the message to edit.
     * @param message - The new message content.
     * @returns The event id of the edited message.
     */
    async editMessage(
        eventId: string,
        message: string,
        options?: {
            /** If set, this message will be linked to a thread with the specified message. */
            threadId?: string
            /** If set, this message will be linked as a reply to the specified message. */
            replyId?: string
            // TODO: would be great to improve the usability here. Its not that ergonomic to pass the `ChannelMessage_Post_Mention` payload itself
            // and its a bit unclear about what are the intetion of the fields.
            /** The users that are mentioned in the message */
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            /** The attachments in the message. You can attach images, videos, links, files, or even other messages. */
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
    ) {
        const channelId = this.data.id
        const result = await this.riverConnection.withStream(channelId).call((client) =>
            client.sendChannelMessage_Edit_Text(channelId, eventId, {
                threadId: options?.threadId,
                threadPreview: options?.threadId ? '🙉' : undefined,
                replyId: options?.replyId,
                replyPreview: options?.replyId ? '🙈' : undefined,
                content: {
                    body: message,
                    mentions: options?.mentions ?? [],
                    attachments: options?.attachments ?? [],
                },
            }),
        )
        return result
    }

    /** Pins a message to the top of the channel.
     * @param eventId - The event id of the message to pin.
     * @returns The event id of the pin action.
     */
    async pin(eventId: string) {
        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) => client.pin(channelId, eventId))
        return result
    }

    /** Unpins a message from the channel.
     * @param eventId - The event id of the message to unpin.
     * @returns The event id of the unpin action.
     */
    async unpin(eventId: string) {
        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) => client.unpin(channelId, eventId))
        return result
    }

    /** Sends a reaction to a message.
     * @param refEventId - The event id of the message to react to.
     * @param reaction - The reaction to send. Can be any string, including emoji, unicode characters.
     */
    async sendReaction(refEventId: string, reaction: string) {
        const channelId = this.data.id
        const eventId = await this.riverConnection.call((client) =>
            client.sendChannelMessage_Reaction(channelId, {
                reaction,
                refEventId,
            }),
        )
        return eventId
    }

    /** Redacts your own event.
     * @param eventId - The event id of the message to redact
     * @param reason - The reason for the redaction
     */
    async redact(eventId: string, reason?: string) {
        const channelId = this.data.id
        const result = await this.riverConnection.withStream(channelId).call((client, stream) => {
            const event = stream.view.timeline.find((x) => x.eventId === eventId)
            if (!event) {
                throw new Error(`ref event not found: ${eventId}`)
            }
            if (event.sender.id !== this.riverConnection.userId) {
                throw new Error(
                    `You can only redact your own messages. Message creator: ${event.sender.id} - Your id: ${this.riverConnection.userId}`,
                )
            }
            return client.sendChannelMessage_Redaction(channelId, {
                refEventId: eventId,
                reason,
            })
        })
        return result
    }

    /** Redacts any message as an admin.
     * @param eventId - The event id of the message to redact
     */
    async adminRedact(eventId: string) {
        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) => client.redactMessage(channelId, eventId))
        return result
    }

    async sendTip(
        messageId: string,
        tip: {
            receiver: string
            amount: bigint
            currency: string
            chainId: number
        },
        signer: ethers.Signer,
    ) {
        const tokenId = await this.spaceDapp.getTokenIdOfOwner(this.data.spaceId, tip.receiver)
        if (!tokenId) {
            throw new Error('tokenId not found')
        }
        const tx = await this.spaceDapp.tip(
            {
                spaceId: this.data.spaceId,
                tokenId,
                currency: tip.currency,
                amount: tip.amount,
                messageId,
                channelId: this.data.id,
                receiver: tip.receiver,
            },
            signer,
        )
        const receipt = await tx.wait()
        const senderAddress = await signer.getAddress()
        const tipEvent = this.spaceDapp.getTipEvent(this.data.spaceId, receipt, senderAddress)
        if (!tipEvent) {
            throw new Error('tipEvent not found')
        }

        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) =>
                client.addTransaction_Tip(tip.chainId, receipt, tipEvent, tip.receiver),
            )
        return result
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.id) {
            const stream = this.riverConnection.client?.stream(this.data.id)
            check(isDefined(stream), 'stream is not defined')
            const hasJoined = stream.view.getMembers().isMemberJoined(this.riverConnection.userId)
            this.setData({ isJoined: hasJoined })
            this.timeline.initialize(stream)
        }
    }

    private onStreamUserJoined = (streamId: string, userId: string) => {
        if (streamId === this.data.id && userId === this.riverConnection.userId) {
            this.setData({ isJoined: true })
        }
    }

    private onStreamUserLeft = (streamId: string, userId: string) => {
        if (streamId === this.data.id && userId === this.riverConnection.userId) {
            this.setData({ isJoined: false })
        }
    }
}
