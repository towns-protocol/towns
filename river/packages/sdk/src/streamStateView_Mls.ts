import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { MemberPayload_Snapshot_Mls, MemberPayload_Snapshot_Mls_Member } from '@river-build/proto'
import { check } from '@river-build/dlog'
import { PlainMessage } from '@bufbuild/protobuf'
import { logNever } from './check'

export class StreamStateView_Mls extends StreamStateView_AbstractContent {
    readonly streamId: string
    externalGroupSnapshot?: Uint8Array
    groupInfoMessage?: Uint8Array
    members: { [key: string]: PlainMessage<MemberPayload_Snapshot_Mls_Member> } = {}
    epochSecrets: { [key: string]: Uint8Array } = {}

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    applySnapshot(content: MemberPayload_Snapshot_Mls): void {
        this.externalGroupSnapshot = content.externalGroupSnapshot
        this.groupInfoMessage = content.groupInfoMessage
        this.members = content.members
        this.epochSecrets = content.epochSecrets
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.value?.content.case == 'mls')
        const mlsEvent = event.remoteEvent.event.payload.value.content.value
        switch (mlsEvent.content.case) {
            case 'initializeGroup':
                this.externalGroupSnapshot = mlsEvent.content.value.externalGroupSnapshot
                this.groupInfoMessage = mlsEvent.content.value.groupInfoMessage
                this.members[event.creatorUserId] = {
                    signaturePublicKeys: [mlsEvent.content.value.signaturePublicKey],
                }
                break
            case 'externalJoin':
                if (!this.members[event.creatorUserId]) {
                    this.members[event.creatorUserId] = {
                        signaturePublicKeys: [],
                    }
                }
                this.members[event.creatorUserId].signaturePublicKeys.push(
                    mlsEvent.content.value.signaturePublicKey,
                )
                break
            case 'epochSecrets':
                for (const secret of mlsEvent.content.value.secrets) {
                    if (!this.epochSecrets[secret.epoch.toString()]) {
                        this.epochSecrets[secret.epoch.toString()] = secret.secret
                    }
                }
                break
            case undefined:
                break
            default:
                logNever(mlsEvent.content)
        }
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        //
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        super.onConfirmedEvent(event, stateEmitter, encryptionEmitter)
    }
}
