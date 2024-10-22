import { PlainMessage } from '@bufbuild/protobuf'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'
import { ChannelMessage_Post_Attachment, ChannelMessage_Post_Mention } from '@river-build/proto'
import { Timeline } from '../../timeline/timeline'
import { check, dlogger } from '@river-build/dlog'
import { isDefined } from '../../../check'
import { ChannelDetails, SpaceDapp } from '@river-build/web3'
import { Members } from '../../members/members'

const logger = dlogger('csb:channel')

export interface ChannelModel extends Identifiable {
    id: string
    spaceId: string
    isJoined: boolean
    metadata?: ChannelDetails
}

@persistedObservable({ tableName: 'channel' })
export class Channel extends PersistedObservable<ChannelModel> {
    timeline: Timeline
    members: Members
    constructor(
        id: string,
        spaceId: string,
        private riverConnection: RiverConnection,
        private spaceDapp: SpaceDapp,
        store: Store,
    ) {
        super({ id, spaceId, isJoined: false }, store, LoadPriority.high)
        this.timeline = new Timeline(riverConnection.userId)
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

    async join() {
        const channelId = this.data.id
        await this.riverConnection.call(async (client) => {
            await client.joinStream(channelId)
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
