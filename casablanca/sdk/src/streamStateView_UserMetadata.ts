import {
    SpacePayload_WrappedEncryptedData as WrappedEncryptedData,
    EncryptedData,
} from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { EmittedEvents } from './client'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { bin_toHexString } from './binary'
import { StreamEvents } from './streamEvents'

export class StreamStateView_UserMetadata {
    readonly userId: string
    readonly streamId: string
    // userId -> WrappedEncryptedData
    readonly usernames = new Map<string, WrappedEncryptedData>()

    // userId -> plaintext displayName (for convenience, tbd)
    readonly plaintextDisplayNames = new Map<string, string>()

    // eventId -> EncryptedData
    readonly pendingUsernameEvents = new Map<
        string,
        { payload: EncryptedData; eventId: string; userId: string }
    >()

    readonly displayNameEvents = new Map<
        string,
        { encryptedData: EncryptedData; userId: string; pending: boolean }
    >()

    constructor(userId: string, streamId: string) {
        this.userId = userId
        this.streamId = streamId
    }

    initialize(
        userMetadata: { [userId: string]: WrappedEncryptedData },
        metadataType: 'username' | 'displayName',
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        // iterate over map adding wrapped encrypted from snapshot pertaining to users
        for (const userId of Object.keys(userMetadata)) {
            const payload = userMetadata[userId]
            if (!payload.data) {
                continue
            }
            if (metadataType == 'username') {
                this.applyUserMetadataEvent(payload, userId, 'username', emitter)
            } else if (metadataType == 'displayName') {
                const eventId = bin_toHexString(payload.eventHash)
                this.displayNameEvents.set(eventId, {
                    encryptedData: payload.data,
                    userId: userId,
                    pending: false,
                })
                emitter?.emit('newEncryptedContent', this.streamId, eventId, {
                    kind: 'text',
                    content: payload.data,
                })
            } else {
                logNever(metadataType)
            }
        }
    }

    onConfirmedEvent(
        confirmedEvent: ConfirmedTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const eventId = confirmedEvent.hashStr
        const usernameEvent = this.pendingUsernameEvents.get(eventId)
        if (usernameEvent) {
            const payload = new WrappedEncryptedData({
                data: usernameEvent.payload,
                eventNum: confirmedEvent.eventNum,
            })
            this.pendingUsernameEvents.delete(eventId)
            this.applyUserMetadataEvent(payload, usernameEvent.userId, 'username', emitter)
        }

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

            case 'username':
                break
        }
    }

    onDecryptedContent(eventId: string, content: string, emitter?: TypedEmitter<EmittedEvents>) {
        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            return
        }

        this.plaintextDisplayNames.set(event.userId, content)
        this.emitDisplayNameUpdated(eventId, emitter)
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

    /**
     * Applies confirmed user metadata event. Either the event arose from a snapshot,
     * or was confirmed by way of the event hash for the EncryptedData child event
     * of the WrappedEncryptedData being included in a miniblock header.
     *
     */
    private applyUserMetadataEvent(
        payload: WrappedEncryptedData,
        userId: string,
        type: 'username',
        emitter?: TypedEmitter<EmittedEvents>,
    ) {
        switch (type) {
            case 'username': {
                this.usernames.set(userId, payload)
                emitter?.emit('streamUsernameUpdated', this.streamId, userId)
                break
            }
            default: {
                logNever(type)
            }
        }
    }
}
