import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelOp,
    ChannelProperties,
    Err,
    EncryptedData,
    Snapshot,
    SpacePayload,
    SpacePayload_Channel,
    SpacePayload_Snapshot,
} from '@river/proto'
import { StreamEvents } from './streamEvents'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { DecryptedContent } from './encryptedContentTypes'
import { check, isDefined, logNever, throwWithCode } from '@river/mecholm'

export class StreamStateView_Space extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly userMetadata: StreamStateView_UserMetadata
    readonly spaceChannelsMetadata = new Map<string, ChannelProperties>()

    constructor(userId: string, streamId: string) {
        super()
        this.memberships = new StreamStateView_Membership(userId, streamId)
        this.userMetadata = new StreamStateView_UserMetadata(userId, streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: SpacePayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // update memberships
        this.memberships.applySnapshot(content.memberships, emitter)

        this.userMetadata.applySnapshot(content.usernames, content.displayNames, emitter)
        // loop over content.channels, update space channels metadata
        for (const [_, payload] of Object.entries(content.channels)) {
            this.addSpacePayload_Channel(payload, emitter)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, emitter)
        this.userMetadata.onConfirmedEvent(event, emitter)
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'spacePayload')
        const payload: SpacePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                // nothing to do, channel data was conveyed in the snapshot
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
                break
            case 'username':
                // nothing to do, username was conveyed in the snapshot
                break
            case 'displayName':
                // nothing to do, displayName was conveyed in the snapshot
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'spacePayload')
        const payload: SpacePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                this.addSpacePayload_Channel(payload.content.value, emitter)
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    emitter,
                )
                break
            case 'displayName':
            case 'username':
                this.userMetadata.appendEncryptedData(
                    event.hashStr,
                    payload.content.value,
                    payload.content.case,
                    event.creatorUserId,
                    cleartext,
                    emitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addSpacePayload_Channel(
        payload: SpacePayload_Channel,
        emitter?: TypedEmitter<StreamEvents>,
    ): void {
        const { op, channelId, channelProperties } = payload
        switch (op) {
            case ChannelOp.CO_CREATED: {
                const props = this.decryptChannelProps(channelProperties)
                this.spaceChannelsMetadata.set(channelId, props)
                emitter?.emit('spaceChannelCreated', this.streamId, channelId, props)
                break
            }
            case ChannelOp.CO_DELETED:
                if (this.spaceChannelsMetadata.delete(channelId)) {
                    emitter?.emit('spaceChannelDeleted', this.streamId, channelId)
                }
                break
            case ChannelOp.CO_UPDATED: {
                const props = this.decryptChannelProps(channelProperties)
                this.spaceChannelsMetadata.set(channelId, props)
                emitter?.emit('spaceChannelUpdated', this.streamId, channelId, props)
                break
            }
            default:
                throwWithCode(`Unknown channel ${op}`, Err.STREAM_BAD_EVENT)
        }
    }

    private decryptChannelProps(encryptedData: EncryptedData | undefined): ChannelProperties {
        //TODO: We need to support decryption once encryption is enabled for Channel EncryptedData events
        let channelProperties = ChannelProperties.fromJsonString(encryptedData?.ciphertext ?? '')
        if (!isDefined(channelProperties)) {
            channelProperties = new ChannelProperties()
        }
        return channelProperties
    }

    onDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        emitter: TypedEmitter<StreamEvents>,
    ): void {
        if (content.kind === 'text') {
            this.userMetadata.onDecryptedContent(eventId, content.content, emitter)
        }
    }

    getUserMetadata(): StreamStateView_UserMetadata {
        return this.userMetadata
    }
}
