import { check, dlogger } from '@towns-protocol/utils'
import { isDefined } from '../../../check'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'
import { Members } from '../../members/members'
import type {
    ChannelMessage_Post_Attachment,
    ChannelMessage_Post_Mention,
    ChannelProperties,
    PlainMessage,
} from '@towns-protocol/proto'
import { MessageTimeline } from '../../timeline/timeline'
import { ITippingShim, type Address } from '@towns-protocol/web3'
import { ethers } from 'ethers'

const logger = dlogger('csb:dm')

export interface DmModel extends Identifiable {
    /** The id of the DM. */
    id: string
    /** Whether the SyncAgent has loaded this data. */
    initialized: boolean
    /** Whether the current user has joined the DM. */
    isJoined: boolean
    /** The metadata of the DM. @see {@link ChannelProperties} */
    metadata?: ChannelProperties
}

@persistedObservable({ tableName: 'dm' })
export class Dm extends PersistedObservable<DmModel> {
    timeline: MessageTimeline
    members: Members
    constructor(
        id: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super({ id, isJoined: false, initialized: false }, store, LoadPriority.high)
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
    }

    async sendMessage(
        message: string,
        options?: {
            threadId?: string
            replyId?: string
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
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

    async pin(eventId: string) {
        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) => client.pin(channelId, eventId))
        return result
    }

    async unpin(eventId: string) {
        const channelId = this.data.id
        const result = await this.riverConnection
            .withStream(channelId)
            .call((client) => client.unpin(channelId, eventId))
        return result
    }

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
                    `You can only redact your own messages: ${eventId} - userId: ${this.riverConnection.userId}`,
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

    /** Sends a tip in a DM context.
     * @param messageId - The event id of the message to tip
     * @param tip - The tip parameters
     * @param signer - The signer to use for the transaction
     */
    async sendTip(
        messageId: string,
        tip: { receiver: Address; currency: Address; amount: bigint; chainId: number },
        signer: ethers.Signer,
    ) {
        const spaceDapp = this.riverConnection.spaceDapp
        const accountModulesAddress = spaceDapp.config.addresses.accountModules
        if (!accountModulesAddress) {
            throw new Error('AccountModules address is not configured')
        }
        const tx = await spaceDapp.sendTip({
            tipParams: {
                type: 'any',
                currency: tip.currency,
                amount: tip.amount,
                messageId,
                channelId: this.data.id,
                receiver: tip.receiver,
            },
            signer,
        })
        const receipt = await tx.wait(3)
        const senderAddress = await signer.getAddress()

        const tippingShim = new ITippingShim(accountModulesAddress, spaceDapp.provider)
        const tipEvent = tippingShim.getTipEvent(receipt, senderAddress)
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
        if (this.data.id === streamId) {
            logger.log('Dm stream initialized', streamId)
            const stream = this.riverConnection.client?.stream(streamId)
            check(isDefined(stream), 'stream is not defined')
            const hasJoined = stream.view.getMembers().isMemberJoined(this.riverConnection.userId)
            this.setData({
                initialized: true,
                isJoined: hasJoined,
                metadata: undefined,
            })
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
