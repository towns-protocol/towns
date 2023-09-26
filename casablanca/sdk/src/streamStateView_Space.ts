import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelOp,
    ChannelProperties,
    EncryptedData,
    Err,
    Snapshot,
    SpacePayload,
    SpacePayload_Channel,
    SpacePayload_Inception,
    SpacePayload_Snapshot,
} from '@river/proto'
import { isDefined, logNever, throwWithCode } from './check'
import { StreamEvents } from './streamEvents'

export class StreamStateView_Space {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    readonly spaceChannelsMetadata = new Map<string, ChannelProperties>()

    constructor(userId: string, inception: SpacePayload_Inception) {
        this.memberships = new StreamStateView_Membership(userId)
        this.streamId = inception.streamId
    }

    initialize(
        snapshot: Snapshot,
        content: SpacePayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // update memberships
        this.memberships.initialize(content.memberships, this.streamId, emitter)
        // loop over content.channels, update space channels metadata
        for (const [_, payload] of Object.entries(content.channels)) {
            this.addSpacePayload_Channel(payload, emitter)
        }
    }

    prependEvent(
        event: ParsedEvent,
        payload: SpacePayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                // nothing to do, channel data was conveyed in the snapshot
                break
            case 'membership':
                // nothing to do, membership was conveyed in the snapshot
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: ParsedEvent,
        payload: SpacePayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                this.addSpacePayload_Channel(payload.content.value, emitter)
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    payload.content.value,
                    this.streamId,
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
        let channelProperties = ChannelProperties.fromJsonString(encryptedData?.text ?? '')
        if (!isDefined(channelProperties)) {
            channelProperties = new ChannelProperties()
        }
        return channelProperties
    }
}
