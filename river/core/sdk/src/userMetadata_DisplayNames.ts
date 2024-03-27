import { EncryptedData } from '@river-build/proto'
import TypedEmitter from 'typed-emitter'
import { dlog } from '@river-build/dlog'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class UserMetadata_DisplayNames {
    log = dlog('csb:streams:displaynames')
    readonly streamId: string
    readonly userIdToEventId = new Map<string, string>()
    readonly plaintextDisplayNames = new Map<string, string>()
    readonly displayNameEvents = new Map<
        string,
        { encryptedData: EncryptedData; userId: string; pending: boolean }
    >()

    constructor(streamId: string) {
        this.streamId = streamId
    }

    addEncryptedData(
        eventId: string,
        encryptedData: EncryptedData,
        userId: string,
        pending: boolean = true,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        this.removeEventForUserId(userId)
        this.addEventForUserId(userId, eventId, encryptedData, pending)

        if (cleartext) {
            this.plaintextDisplayNames.set(userId, cleartext)
        } else {
            // Clear the plaintext display name for this user on name change
            this.plaintextDisplayNames.delete(userId)
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, eventId, {
                kind: 'text',
                content: encryptedData,
            })
        }
        this.emitDisplayNameUpdated(eventId, stateEmitter)
    }

    onConfirmEvent(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            return
        }
        this.displayNameEvents.set(eventId, { ...event, pending: false })

        // if we don't have the plaintext display name, no need to emit an event
        if (this.plaintextDisplayNames.has(event.userId)) {
            this.log(`'streamDisplayNameUpdated' for userId ${event.userId}`)
            this.emitDisplayNameUpdated(eventId, emitter)
        }
    }

    onDecryptedContent(
        eventId: string,
        content: string,
        emitter?: TypedEmitter<StreamStateEvents>,
    ) {
        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            return
        }

        this.log(`setting display name ${content} for user ${event.userId}`)
        this.plaintextDisplayNames.set(event.userId, content)
        this.emitDisplayNameUpdated(eventId, emitter)
    }

    private emitDisplayNameUpdated(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            return
        }
        // no information to emit — we haven't decrypted the display name yet
        if (!this.plaintextDisplayNames.has(event.userId)) {
            return
        }

        // depending on confirmation status, emit different events
        emitter?.emit(
            event.pending ? 'streamPendingDisplayNameUpdated' : 'streamDisplayNameUpdated',
            this.streamId,
            event.userId,
        )
    }

    private removeEventForUserId(userId: string) {
        // remove any traces of old events for this user
        const eventId = this.userIdToEventId.get(userId)
        if (!eventId) {
            this.log(`no existing displayName event for user ${userId}`)
            return
        }

        const event = this.displayNameEvents.get(eventId)
        if (!event) {
            this.log(`no existing event for user ${userId} — this is a programmer error`)
            return
        }
        this.displayNameEvents.delete(eventId)
        this.log(`deleted old event for user ${userId}`)
    }

    private addEventForUserId(
        userId: string,
        eventId: string,
        encryptedData: EncryptedData,
        pending: boolean,
    ) {
        // add to the userId -> eventId mapping for fast lookup later
        this.userIdToEventId.set(userId, eventId)
        this.displayNameEvents.set(eventId, {
            userId,
            encryptedData: encryptedData,
            pending: pending,
        })
    }

    info(userId: string): {
        displayName: string
        displayNameEncrypted: boolean
    } {
        const displayName = this.plaintextDisplayNames.get(userId) ?? ''
        const displayNameEncrypted =
            !this.plaintextDisplayNames.has(userId) && this.userIdToEventId.has(userId)

        return { displayName, displayNameEncrypted }
    }
}
