import {
    SpacePayload_WrappedEncryptedData as WrappedEncryptedData,
    EncryptedData,
    MiniblockHeader,
} from '@river/proto'
import { logNever } from './check'
import TypedEmitter from 'typed-emitter'
import { EmittedEvents } from './client'
import { bin_toHexString } from './binary'

export class StreamStateView_UserMetadata {
    readonly userId: string
    readonly streamId: string
    // userId -> WrappedEncryptedData
    readonly usernames = new Map<string, WrappedEncryptedData>()
    // userId -> WrappedEncryptedData
    readonly displayNames = new Map<string, WrappedEncryptedData>()
    // eventId -> EncryptedData
    readonly pendingUsernameEvents = new Map<
        string,
        { payload: EncryptedData; eventId: string; userId: string }
    >()
    // eventId -> EncryptedData
    readonly pendingDisplayNameEvents = new Map<
        string,
        { payload: EncryptedData; eventId: string; userId: string }
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
            if (metadataType == 'username') {
                this.applyUserMetadataEvent(payload, userId, 'username', emitter)
            } else if (metadataType == 'displayName') {
                this.applyUserMetadataEvent(payload, userId, 'displayName', emitter)
            } else {
                logNever(metadataType)
            }
        }
    }

    /**
     * process a miniblock header, applying user metadata events in order
     */
    onMiniblockHeader(blockHeader: MiniblockHeader, emitter?: TypedEmitter<EmittedEvents>): void {
        // loop over confirmed events, apply user metadata events in order
        let i = 0
        for (const eventHash of blockHeader.eventHashes) {
            const eventId = bin_toHexString(eventHash)
            let event = this.pendingUsernameEvents.get(eventId)
            if (event) {
                const payload = new WrappedEncryptedData({
                    data: event.payload,
                    eventNum: BigInt(blockHeader.eventNumOffset) + BigInt(i),
                })
                i++
                this.pendingUsernameEvents.delete(eventId)
                this.applyUserMetadataEvent(payload, event.userId, 'username', emitter)
                continue
            }
            event = this.pendingDisplayNameEvents.get(eventId)

            if (event) {
                const payload = new WrappedEncryptedData({
                    data: event.payload,
                    eventNum: BigInt(blockHeader.eventNumOffset) + BigInt(i),
                })
                i++
                this.pendingDisplayNameEvents.delete(eventId)
                this.applyUserMetadataEvent(payload, event.userId, 'displayName', emitter)
            }
        }
    }

    /**
     * Places event in a pending queue, to be applied when the event is confirmed in a miniblock header
     */
    appendUserMetadataEvent(
        eventId: string,
        userId: string,
        payload: EncryptedData,
        type: 'username' | 'displayName',
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        switch (type) {
            case 'username':
                this.pendingUsernameEvents.set(eventId, { eventId, payload, userId })
                emitter?.emit('streamPendingUsernameUpdated', this.streamId, userId)
                break
            case 'displayName':
                this.pendingDisplayNameEvents.set(eventId, { eventId, payload, userId })
                emitter?.emit('streamPendingDisplayNameUpdated', this.streamId, userId)
                break
            default:
                logNever(type)
        }
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
        type: 'username' | 'displayName',
        emitter?: TypedEmitter<EmittedEvents>,
    ) {
        switch (type) {
            case 'username':
                this.usernames.set(userId, payload)
                emitter?.emit('streamUsernameUpdated', this.streamId, userId)
                break
            case 'displayName':
                this.displayNames.set(userId, payload)
                emitter?.emit('streamDisplayNameUpdated', this.streamId, userId)
                break
            default:
                logNever(type)
        }
    }
}
