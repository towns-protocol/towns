import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    ChannelOp,
    ChannelProperties,
    EncryptedData,
    Err,
    SpacePayload,
    SpacePayload_Channel,
    SpacePayload_Inception,
} from '@river/proto'
import { isDefined, logNever, throwWithCode } from './check'
import { StreamEvents } from './streamEvents'

export class StreamStateView_Space {
    readonly streamId: string
    readonly name?: string
    readonly memberships = new StreamStateView_Membership()
    readonly spaceChannelsMetadata = new Map<string, ChannelProperties>()

    constructor(inception: SpacePayload_Inception) {
        this.streamId = inception.streamId
        this.name = inception.name
    }

    appendEvent(
        event: ParsedEvent,
        payload: SpacePayload,
        emitter?: TypedEmitter<EmittedEvents>,
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
