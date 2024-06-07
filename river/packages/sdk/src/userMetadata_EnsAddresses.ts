import TypedEmitter from 'typed-emitter'
import { dlog } from '@river-build/dlog'
import { StreamStateEvents } from './streamEvents'
import { userIdFromAddress } from './id'

export class userMetadata_EnsAddresses {
    log = dlog('csb:streams:ensAddresses')
    readonly streamId: string
    readonly userIdToEventId = new Map<string, string>()
    readonly confirmedEnsAddresses = new Map<string, string>()
    readonly ensAddressEvents = new Map<
        string,
        { ensAddress: Uint8Array; userId: string; pending: boolean }
    >()

    constructor(streamId: string) {
        this.streamId = streamId
    }

    applySnapshot(ensAddresses: { userId: string; ensAddress: Uint8Array }[]) {
        for (const item of ensAddresses) {
            if (item.ensAddress.length > 0) {
                if (item.ensAddress.length > 0) {
                    this.confirmedEnsAddresses.set(item.userId, userIdFromAddress(item.ensAddress))
                }
            }
        }
    }

    addEnsAddressEvent(
        eventId: string,
        ensAddress: Uint8Array,
        userId: string,
        pending: boolean,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        this.removeEventForUserId(userId)
        if (!pending) {
            if (ensAddress.length > 0) {
                this.confirmedEnsAddresses.set(userId, userIdFromAddress(ensAddress))
            } else {
                this.confirmedEnsAddresses.delete(userId)
            }
        }
        this.addEventForUserId(userId, eventId, ensAddress, pending)
        this.emitEnsAddressUpdated(eventId, stateEmitter)
    }

    onConfirmEvent(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.ensAddressEvents.get(eventId)
        if (!event) {
            return
        }
        this.ensAddressEvents.set(eventId, { ...event, pending: false })

        if (event.ensAddress.length > 0) {
            this.confirmedEnsAddresses.set(event.userId, userIdFromAddress(event.ensAddress))
        } else {
            this.confirmedEnsAddresses.delete(event.userId)
        }

        this.emitEnsAddressUpdated(eventId, emitter)
    }

    private emitEnsAddressUpdated(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.ensAddressEvents.get(eventId)
        if (!event) {
            return
        }
        if (event.pending) {
            return
        }
        emitter?.emit('streamEnsAddressUpdated', this.streamId, event.userId)
    }

    private removeEventForUserId(userId: string) {
        // remove any traces of old events for this user
        const eventId = this.userIdToEventId.get(userId)
        if (!eventId) {
            this.log(`no existing ens event for user ${userId}`)
            return
        }

        const event = this.ensAddressEvents.get(eventId)
        if (!event) {
            this.log(`no existing event for user ${userId} — this is a programmer error`)
            return
        }
        this.ensAddressEvents.delete(eventId)
        this.log(`deleted old event for user ${userId}`)
    }

    private addEventForUserId(
        userId: string,
        eventId: string,
        ensAddress: Uint8Array,
        pending: boolean,
    ) {
        // add to the userId -> eventId mapping for fast lookup later
        this.userIdToEventId.set(userId, eventId)
        this.ensAddressEvents.set(eventId, {
            userId,
            ensAddress: ensAddress,
            pending: pending,
        })
    }

    info(userId: string): string | undefined {
        return this.confirmedEnsAddresses.get(userId)
    }
}
