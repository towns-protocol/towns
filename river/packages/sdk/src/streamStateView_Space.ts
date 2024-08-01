import TypedEmitter from 'typed-emitter'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import {
    ChannelOp,
    Err,
    Snapshot,
    SpacePayload,
    SpacePayload_ChannelUpdate,
    SpacePayload_ChannelMetadata,
    SpacePayload_Snapshot,
    ChunkedMedia,
    EncryptedData,
} from '@river-build/proto'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { DecryptedContent } from './encryptedContentTypes'
import { check, throwWithCode } from '@river-build/dlog'
import { logNever } from './check'
import { contractAddressFromSpaceId, isDefaultChannelId, streamIdAsString } from './id'
import { decryptDerivedAESGCM } from './crypto_utils'

export type ParsedChannelProperties = {
    isDefault: boolean
    updatedAtEventNum: bigint
}

export class StreamStateView_Space extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly spaceChannelsMetadata = new Map<string, ParsedChannelProperties>()
    private _spaceImage: ChunkedMedia | undefined

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    get spaceImage(): ChunkedMedia | undefined {
        return this._spaceImage
    }

    private set spaceImage(value: ChunkedMedia | undefined) {
        this._spaceImage = value
    }

    applySnapshot(
        eventHash: string,
        snapshot: Snapshot,
        content: SpacePayload_Snapshot,
        _cleartexts: Record<string, string> | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // loop over content.channels, update space channels metadata
        for (const payload of content.channels) {
            this.addSpacePayload_Channel(eventHash, payload, payload.updatedAtEventNum, undefined)
        }

        if (content.spaceImage?.data) {
            this.decryptSpaceImage(content.spaceImage.data)
                .then((media) => {
                    this.spaceImage = media
                })
                .catch((err) => {
                    throw err
                })
        }
    }

    onConfirmedEvent(
        _event: ConfirmedTimelineEvent,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // pass
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'spacePayload')
        const payload: SpacePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                // nothing to do, channel data was conveyed in the snapshot
                break
            case 'spaceImage':
                // nothing to do, spaceImage is set in the snapshot
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
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'spacePayload')
        const payload: SpacePayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'channel':
                this.addSpacePayload_Channel(
                    event.hashStr,
                    payload.content.value,
                    event.eventNum,
                    stateEmitter,
                )
                break
            case 'spaceImage':
                this.decryptSpaceImage(payload.content.value)
                    .then((media) => {
                        this.spaceImage = media
                    })
                    .catch((err) => {
                        throw err
                    })
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private async decryptSpaceImage(encryptedImage: EncryptedData): Promise<ChunkedMedia> {
        const keyPhrase = contractAddressFromSpaceId(this.streamId)
        const plaintext = await decryptDerivedAESGCM(keyPhrase, encryptedImage)
        return ChunkedMedia.fromBinary(plaintext)
    }

    private addSpacePayload_Channel(
        eventHash: string,
        payload: SpacePayload_ChannelMetadata | SpacePayload_ChannelUpdate,
        updatedAtEventNum: bigint,
        stateEmitter?: TypedEmitter<StreamStateEvents>,
    ): void {
        const { op, channelId: channelIdBytes } = payload
        const channelId = streamIdAsString(channelIdBytes)
        switch (op) {
            case ChannelOp.CO_CREATED: {
                this.spaceChannelsMetadata.set(channelId, {
                    isDefault: isDefaultChannelId(channelId),
                    updatedAtEventNum,
                })
                stateEmitter?.emit('spaceChannelCreated', this.streamId, channelId)
                break
            }
            case ChannelOp.CO_DELETED:
                if (this.spaceChannelsMetadata.delete(channelId)) {
                    stateEmitter?.emit('spaceChannelDeleted', this.streamId, channelId)
                }
                break
            case ChannelOp.CO_UPDATED: {
                this.spaceChannelsMetadata.set(channelId, {
                    isDefault: isDefaultChannelId(channelId),
                    updatedAtEventNum,
                })
                stateEmitter?.emit(
                    'spaceChannelUpdated',
                    this.streamId,
                    channelId,
                    updatedAtEventNum,
                )
                break
            }
            default:
                throwWithCode(`Unknown channel ${op}`, Err.STREAM_BAD_EVENT)
        }
    }

    onDecryptedContent(
        _eventId: string,
        _content: DecryptedContent,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // pass
    }
}
