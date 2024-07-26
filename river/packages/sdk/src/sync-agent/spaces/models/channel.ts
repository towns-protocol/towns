import { PlainMessage } from '@bufbuild/protobuf'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'
import { ChannelMessage_Post_Attachment, ChannelMessage_Post_Mention } from '@river-build/proto'
import { Timeline } from '../../timeline/timeline'
import { check, dlogger } from '@river-build/dlog'
import { isDefined } from '../../../check'
import { Observable } from '../../../observable/observable'
import { StreamConnectionStatus } from '../../streams/models/streamConnectionStatus'
import { ChannelDetails, SpaceDapp } from '@river-build/web3'

const logger = dlogger('csb:channel')

export interface ChannelModel extends Identifiable {
    id: string
    spaceId: string
    isJoined: boolean
    metadata?: ChannelDetails
}

@persistedObservable({ tableName: 'channel' })
export class Channel extends PersistedObservable<ChannelModel> {
    connectionStatus = new Observable<StreamConnectionStatus>(StreamConnectionStatus.connecting)
    timeline: Timeline
    constructor(
        id: string,
        spaceId: string,
        private riverConnection: RiverConnection,
        private spaceDapp: SpaceDapp,
        store: Store,
    ) {
        super({ id, spaceId, isJoined: false }, store)
        this.timeline = new Timeline(riverConnection.userId)
    }

    protected override async onLoaded() {
        this.riverConnection.registerView((client) => {
            this.connectionStatus.setValue(StreamConnectionStatus.connecting)
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                this.connectionStatus.setValue(StreamConnectionStatus.disconnected)
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

    async sendMessage(
        message: string,
        options?: {
            threadId?: string
            replyId?: string
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
    ) {
        await this.connectionStatus.when((status) => status === StreamConnectionStatus.connected)
        const channelId = this.data.id
        const eventId = await this.riverConnection.call((client) =>
            client.sendChannelMessage_Text(channelId, {
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
        return eventId
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
            this.timeline.initialize(stream)
            this.connectionStatus.setValue(StreamConnectionStatus.connected)
        }
    }
}
