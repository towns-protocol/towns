import { WrappedEncryptedData as WrappedEncryptedData, EncryptedData } from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { bin_toHexString } from './binary'
import { StreamEvents } from './streamEvents'
import { Usernames } from './usernames'

export class StreamStateView_UserMetadata {
    readonly userId: string
    readonly streamId: string
    readonly usernames: Usernames
    get plaintextUsernames() {
        return this.usernames.plaintextUsernames
    }

    readonly plaintextDisplayNames = new Map<string, string>()
    readonly displayNameEvents = new Map<
        string,
        { encryptedData: EncryptedData; userId: string; pending: boolean }
    >()

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
        this.usernames = new Usernames(streamId)
    }

    initialize(
        userMetadata: { [userId: string]: WrappedEncryptedData },
        metadataType: 'username' | 'displayName',
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // Sort the payloads — this is necessary because we want to
        // make sure that whoever claimed a username first gets it.
        const sortedPayloads = sortPayloads(userMetadata)

        if (metadataType === 'username') {
            for (const payload of sortedPayloads) {
                if (!payload.wrappedEncryptedData.data) {
                    continue
                }
                const eventId = bin_toHexString(payload.wrappedEncryptedData.eventHash)
                this.usernames.addEncryptedData(
                    eventId,
                    payload.wrappedEncryptedData.data,
                    payload.userId,
                    false,
                    undefined,
                    emitter,
                )
            }
        } else if (metadataType === 'displayName') {
            for (const payload of sortedPayloads) {
                if (!payload.wrappedEncryptedData.data) {
                    continue
                }
                const eventId = bin_toHexString(payload.wrappedEncryptedData.eventHash)
                this.displayNameEvents.set(eventId, {
                    encryptedData: payload.wrappedEncryptedData.data,
                    userId: payload.userId,
                    pending: false,
                })
                emitter?.emit('newEncryptedContent', this.streamId, eventId, {
                    kind: 'text',
                    content: payload.wrappedEncryptedData.data,
                })
            }
        } else {
            logNever(metadataType)
        }
    }

    onConfirmedEvent(
        confirmedEvent: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const eventId = confirmedEvent.hashStr
        this.usernames.onConfirmEvent(eventId, emitter)

        const displayNameEvent = this.displayNameEvents.get(eventId)
        if (displayNameEvent) {
            this.displayNameEvents.set(eventId, { ...displayNameEvent, pending: false })
            this.emitDisplayNameUpdated(eventId, emitter)
        }
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // usernames were conveyed in the snapshot
    }

    appendEncryptedData(
        eventId: string,
        encryptedData: EncryptedData,
        kind: 'displayName' | 'username',
        userId: string,
        cleartext: string | undefined,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        switch (kind) {
            case 'displayName': {
                this.displayNameEvents.set(eventId, {
                    userId,
                    encryptedData: encryptedData,
                    pending: true,
                })
                if (cleartext) {
                    this.plaintextDisplayNames.set(userId, cleartext)
                    this.emitDisplayNameUpdated(eventId, emitter)
                } else {
                    emitter?.emit('newEncryptedContent', this.streamId, eventId, {
                        kind: 'text',
                        content: encryptedData,
                    })
                }
                break
            }

            case 'username': {
                this.usernames.addEncryptedData(
                    eventId,
                    encryptedData,
                    userId,
                    true,
                    cleartext,
                    emitter,
                )
                break
            }
        }
    }

    onDecryptedContent(eventId: string, content: string, emitter?: TypedEmitter<EmittedEvents>) {
        const displayNameEvent = this.displayNameEvents.get(eventId)

        if (displayNameEvent) {
            this.plaintextDisplayNames.set(displayNameEvent.userId, content)
            this.emitDisplayNameUpdated(eventId, emitter)
            return
        }

        this.usernames.onDecryptedContent(eventId, content, emitter)
    }

    emitDisplayNameUpdated(eventId: string, emitter?: TypedEmitter<EmittedEvents>) {
        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            return
        }
        // no information to emit — we haven't decrypted the display name yet
        if (!this.plaintextDisplayNames.has(event.userId)) {
            return
        }
        emitter?.emit(
            event.pending ? 'streamPendingDisplayNameUpdated' : 'streamDisplayNameUpdated',
            this.streamId,
            event.userId,
        )
    }
}

function sortPayloads(object: {
    [userId: string]: WrappedEncryptedData
}): { userId: string; wrappedEncryptedData: WrappedEncryptedData }[] {
    return Object.entries(object)
        .map(([userId, wrappedEncryptedData]) => {
            return {
                userId,
                wrappedEncryptedData,
            }
        })
        .sort((a, b) => {
            if (a.wrappedEncryptedData.eventNum > b.wrappedEncryptedData.eventNum) {
                return 1
            } else if (a.wrappedEncryptedData.eventNum < b.wrappedEncryptedData.eventNum) {
                return -1
            } else {
                return 0
            }
        })
}
