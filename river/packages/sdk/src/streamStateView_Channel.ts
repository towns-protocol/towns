import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent, StreamTimelineEvent, makeRemoteTimelineEvent } from './types'
import { ChannelPayload, ChannelPayload_Snapshot, Snapshot } from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { bin_toHexString, check } from '@river-build/dlog'
import { isDefined, logNever } from './check'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { streamIdFromBytes } from './id'
import { makeParsedEvent } from './sign'
import { DecryptedContent } from './encryptedContentTypes'

export interface Pin {
    event: StreamTimelineEvent
}

export class StreamStateView_Channel extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly pins: Pin[] = []
    spaceId: string = ''
    private reachedRenderableContent = false

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    getStreamParentId(): string | undefined {
        return this.spaceId
    }

    needsScrollback(): boolean {
        return !this.reachedRenderableContent
    }

    applySnapshot(
        snapshot: Snapshot,
        content: ChannelPayload_Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.spaceId = streamIdFromBytes(content.inception?.spaceId ?? Uint8Array.from([]))
        content.pins.forEach((pin) => {
            if (pin.event) {
                const parsedEvent = makeParsedEvent(pin.event, pin.eventId)
                const remoteEvent = makeRemoteTimelineEvent({ parsedEvent, eventNum: 0n })
                const cleartext = cleartexts?.[remoteEvent.hashStr]
                this.addPin(remoteEvent, cleartext, encryptionEmitter, undefined)
            }
        })
    }

    onDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        const index = this.pins.findIndex((pin) => pin.event.hashStr === eventId)
        if (index !== -1) {
            this.pins[index].event.decryptedContent = content
            stateEmitter?.emit('channelPinDecrypted', this.streamId, this.pins[index], index)
        }
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
                // if we have a refEventId it means we're a reaction or thread message
                if (!payload.content.value.refEventId) {
                    this.reachedRenderableContent = true
                }
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'redaction':
                break
            case 'pin':
                break
            case 'unpin':
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
        check(event.remoteEvent.event.payload.case === 'channelPayload')
        const payload: ChannelPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'message':
                if (!payload.content.value.refEventId) {
                    this.reachedRenderableContent = true
                }
                this.decryptEvent(
                    'channelMessage',
                    event,
                    payload.content.value,
                    cleartext,
                    encryptionEmitter,
                )
                break
            case 'redaction':
                break
            case 'pin':
                {
                    const pin = payload.content.value
                    check(isDefined(pin.event), 'invalid pin event')
                    const parsedEvent = makeParsedEvent(pin.event, pin.eventId)
                    const remoteEvent = makeRemoteTimelineEvent({ parsedEvent, eventNum: 0n })
                    this.addPin(remoteEvent, undefined, encryptionEmitter, stateEmitter)
                }
                break
            case 'unpin':
                {
                    const eventId = payload.content.value.eventId
                    this.removePin(eventId, stateEmitter)
                }
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addPin(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const newPin = { event }
        this.pins.push(newPin)
        if (
            event.remoteEvent.event.payload.case === 'channelPayload' &&
            event.remoteEvent.event.payload.value.content.case === 'message'
        ) {
            this.decryptEvent(
                'channelMessage',
                event,
                event.remoteEvent.event.payload.value.content.value,
                cleartext,
                encryptionEmitter,
            )
        }
        stateEmitter?.emit('channelPinAdded', this.streamId, newPin)
    }

    private removePin(
        eventId: Uint8Array,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const eventIdStr = bin_toHexString(eventId)
        const index = this.pins.findIndex((pin) => pin.event.hashStr === eventIdStr)
        if (index !== -1) {
            const pin = this.pins.splice(index, 1)[0]
            stateEmitter?.emit('channelPinRemoved', this.streamId, pin, index)
        }
    }
}
