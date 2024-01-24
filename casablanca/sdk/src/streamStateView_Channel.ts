import TypedEmitter from 'typed-emitter'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { RemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check, logNever } from '@river/waterproof'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_Membership
    spaceId: string = ''

    constructor(userId: string, streamId: string) {
        super()
        this.memberships = new StreamStateView_Membership(userId, streamId)
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.memberships.applySnapshot(content.memberships, encryptionEmitter)
        this.spaceId = content.inception?.spaceId ?? ''
    }

    prependEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
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
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'membership':
                this.memberships.appendMembershipEvent(
                    event.hashStr,
                    payload.content.value,
                    encryptionEmitter,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }
}
