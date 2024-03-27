import TypedEmitter from 'typed-emitter'
import { EncryptedData } from '@river-build/proto'
import { usernameChecksum } from './utils'
import { dlog } from '@river-build/dlog'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class UserMetadata_Usernames {
    log = dlog('csb:streams:usernames')
    readonly streamId: string
    readonly plaintextUsernames = new Map<string, string>()
    readonly userIdToEventId = new Map<string, string>()
    readonly confirmedUserIds = new Set<string>()
    readonly usernameEvents = new Map<
        string,
        { encryptedData: EncryptedData; userId: string; pending: boolean }
    >()
    readonly checksums = new Set<string>()

    constructor(streamId: string) {
        this.streamId = streamId
    }

    setLocalUsername(userId: string, username: string, emitter?: TypedEmitter<StreamStateEvents>) {
        this.plaintextUsernames.set(userId, username)
        emitter?.emit('streamPendingUsernameUpdated', this.streamId, userId)
    }

    resetLocalUsername(userId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        this.plaintextUsernames.delete(userId)
        emitter?.emit('streamPendingUsernameUpdated', this.streamId, userId)
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
        if (!encryptedData.checksum) {
            this.log('no checksum in encrypted data')
            return
        }
        if (!this.usernameAvailable(encryptedData.checksum)) {
            this.log(`username not available for checksum ${encryptedData.checksum}`)
            return
        }

        this.removeUsernameEventForUserId(userId)
        this.addUsernameEventForUserId(userId, eventId, encryptedData, pending)

        if (cleartext) {
            this.plaintextUsernames.set(userId, cleartext)
        } else {
            // Clear the plaintext username for this user on name change
            this.plaintextUsernames.delete(userId)
            encryptionEmitter?.emit('newEncryptedContent', this.streamId, eventId, {
                kind: 'text',
                content: encryptedData,
            })
        }

        if (!pending) {
            this.confirmedUserIds.add(userId)
        }

        this.emitUsernameUpdated(eventId, stateEmitter)
    }

    onConfirmEvent(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.usernameEvents.get(eventId)
        if (!event) {
            return
        }
        this.usernameEvents.set(eventId, { ...event, pending: false })
        this.confirmedUserIds.add(event.userId)

        // if we don't have the plaintext username, no need to emit an event
        if (this.plaintextUsernames.has(event.userId)) {
            this.log(`'streamUsernameUpdated' for userId ${event.userId}`)
            this.emitUsernameUpdated(eventId, emitter)
        }
    }

    onDecryptedContent(
        eventId: string,
        content: string,
        emitter?: TypedEmitter<StreamStateEvents>,
    ) {
        const event = this.usernameEvents.get(eventId)
        if (!event) {
            return
        }

        const checksum = event.encryptedData.checksum
        if (!checksum) {
            return
        }

        // If the checksum doesn't match, we don't want to update the username
        const calculatedChecksum = usernameChecksum(content, this.streamId)
        if (checksum !== calculatedChecksum) {
            this.log(`checksum mismatch for userId: ${event.userId}, username: ${content}`)
            return
        }

        this.log(`setting username ${content} for user ${event.userId}`)
        this.plaintextUsernames.set(event.userId, content)
        this.emitUsernameUpdated(eventId, emitter)
    }

    cleartextUsernameAvailable(username: string): boolean {
        const checksum = usernameChecksum(username, this.streamId)
        return this.usernameAvailable(checksum)
    }

    usernameAvailable(checksum: string): boolean {
        return !this.checksums.has(checksum)
    }

    private emitUsernameUpdated(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.usernameEvents.get(eventId)
        if (!event) {
            return
        }
        // no information to emit — we haven't decrypted the username yet
        if (!this.plaintextUsernames.has(event.userId)) {
            return
        }

        // depending on confirmation status, emit different events
        emitter?.emit(
            event.pending ? 'streamPendingUsernameUpdated' : 'streamUsernameUpdated',
            this.streamId,
            event.userId,
        )
    }

    private removeUsernameEventForUserId(userId: string) {
        // remove any traces of old events for this user
        // we do this because unused usernames should be freed up for other users to use
        const eventId = this.userIdToEventId.get(userId)
        if (!eventId) {
            this.log(`no existing username event for user ${userId}`)
            return
        }

        const event = this.usernameEvents.get(eventId)
        if (!event) {
            this.log(`no existing username event for user ${userId} — this is a programmer error`)
            return
        }
        this.checksums.delete(event.encryptedData.checksum ?? '')
        this.usernameEvents.delete(eventId)
        this.log(`deleted old username event for user ${userId}`)
    }

    private addUsernameEventForUserId(
        userId: string,
        eventId: string,
        encryptedData: EncryptedData,
        pending: boolean,
    ) {
        if (!encryptedData.checksum) {
            this.log('no checksum in encrypted data')
            return
        }

        // add to the userId -> eventId mapping for fast lookup later
        this.userIdToEventId.set(userId, eventId)

        // Set the checksum. This user has now claimed this checksum
        // and no other users are able to use a username with the same checksum
        this.checksums.add(encryptedData.checksum)

        this.usernameEvents.set(eventId, {
            userId,
            encryptedData: encryptedData,
            pending: pending,
        })
    }

    info(userId: string): {
        username: string
        usernameConfirmed: boolean
        usernameEncrypted: boolean
    } {
        const name = this.plaintextUsernames.get(userId) ?? ''
        const eventId = this.userIdToEventId.get(userId)
        if (!eventId) {
            return {
                username: name,
                usernameConfirmed: false,
                usernameEncrypted: false,
            }
        }
        const encrypted = this.usernameEvents.has(eventId) && !this.plaintextUsernames.has(userId)
        return {
            username: name,
            usernameConfirmed: this.confirmedUserIds.has(userId),
            usernameEncrypted: encrypted,
        }
    }
}
