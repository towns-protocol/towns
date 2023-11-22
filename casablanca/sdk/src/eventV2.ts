import { dlog } from './dlog'
import { ChannelMessage, EncryptedData } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { Crypto } from './crypto/crypto'

const log = dlog('csb:event')

interface IEncryptedEvent {
    event_id: string // a unique identifer of event (usually hashStr from StreamEvent)
    stream_id: string
    channel_id?: string
    content: EncryptedData
}

export type ClearContent = {
    content: ChannelMessage | undefined
    type?: string // decrypted content type if available (i.e. channelMessage)
    error?: Partial<ErrorContent>
}

export type ErrorContent = {
    type: string
    msg: string
}

export type RiverEventsV2 = {
    eventDecrypted: (event: RiverEventV2, err?: Error) => void
}

export interface IDecryptOptions {
    // Emits "event.decrypted" if set to true
    emit?: boolean
    emitter?: TypedEmitter<RiverEventsV2>
    // True if this is a retry (enables more logging)
    isRetry?: boolean
}

export class RiverEventV2 {
    private clearEvent?: ClearContent
    /** if we have a process decrypting this event, returns a Promise
     * which resolves when the decryption completes. Typically null.
     */
    private decryptionPromise: Promise<void> | null = null
    /* flag to indicate if we should retry decrypting this event after the
     * first attempt (eg, we have received new data which means that a second
     * attempt may succeed)
     */
    private retryDecryption = false

    constructor(
        public encryptedEvent: IEncryptedEvent,
        private emitter?: TypedEmitter<RiverEventsV2>,
        public wireEvent?: ParsedEvent,
    ) {
        if (wireEvent && wireEvent.hashStr !== encryptedEvent.event_id) {
            throw new Error(
                `hashStr mismatch between wireEvent and encryptedEvent, ${wireEvent.hashStr} vs ${encryptedEvent.event_id}`,
            )
        }
    }

    public getChannelId(): string | undefined {
        return this.encryptedEvent.channel_id
    }

    public getStreamId(): string {
        return this.encryptedEvent.stream_id
    }

    public getId(): string | undefined {
        return this.encryptedEvent.event_id
    }

    public getSender(): string | undefined {
        // sender is required in the constructor so this case is appropriate
        return this.wireEvent?.creatorUserId
    }

    public isDecryptionFailure(): boolean {
        return this.clearEvent?.error?.type === 'm.bad.encrypted'
    }

    public shouldAttemptDecryption(): boolean {
        if (this.clearEvent) {
            return false
        }
        return true
    }

    public async attemptDecryption(crypto: Crypto, options: IDecryptOptions = {}): Promise<void> {
        const alreadyDecrypted = this.clearEvent && !this.isDecryptionFailure()
        if (options?.emit !== false && options.emitter) {
            this.setEmitter(options.emitter)
        }
        if (alreadyDecrypted) {
            // maybe we should throw an error here, but for now just return
            log('attemptDecryption called on already decrypted event')
            return Promise.resolve()
        }
        // if we already have a decryption attempt in progress, then it may
        // fail because it was using outdated info. We now have reason to
        // succeed where it failed before, but we don't want to have multiple
        // attempts going at the same time, so just set a flag that says we have
        // new info.
        //
        if (this.decryptionPromise) {
            log('attemptDecryption already being decrypted, queueing a retry nonetheless')
            this.retryDecryption = true
            return this.decryptionPromise
        }

        this.decryptionPromise = this.decryptionLoop(crypto, options)
        return this.decryptionPromise
    }

    private async decryptionLoop(crypto: Crypto, options: IDecryptOptions = {}): Promise<void> {
        // make sure that this method never runs completely synchronously.
        // (doing so would mean that we would clear decryptionPromise *before*
        // it is set in attemptDecryption - and hence end up with a stuck
        // `decryptionPromise`).

        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.retryDecryption = false

            let res: ClearContent
            let err: Error | undefined = undefined
            try {
                if (!crypto) {
                    res = this.badEncryptedMessage('Encryption not enabled')
                } else {
                    res = await crypto.decryptMegolmEvent(this)
                    if (options.isRetry === true) {
                        log(`Decrypted event on retry (${this.getDetails()})`)
                    }
                }
            } catch (e) {
                const detailedError = String(e)

                err = e as Error

                // see if we have a retry queued.
                //
                // NB: make sure to keep this check in the same tick of the
                //   event loop as `decryptionPromise = null` below - otherwise we
                //   risk a race:
                //
                //   * A: we check retryDecryption here and see that it is
                //        false
                //   * B: we get a second call to attemptDecryption, which sees
                //        that decryptionPromise is set so sets
                //        retryDecryption
                //   * A: we continue below, clear decryptionPromise, and
                //        never do the retry.
                //
                if (this.retryDecryption) {
                    // decryption error, but we have a retry queued.
                    log(
                        `Error decrypting event (${this.getDetails()}), but retrying: ${detailedError}`,
                    )
                    continue
                }

                // decryption error, no retries queued. Warn about the error and
                // set it to m.bad.encrypted.
                //
                // the detailedString already includes the name and message of the error, and the stack isn't much use,
                // so we don't bother to log `e` separately.
                log(`Error decrypting event (${this.getDetails()}): ${detailedError}`)

                res = this.badEncryptedMessage(String(e))
            }

            // at this point, we've either successfully decrypted the event, or have given up
            // (and set res to a 'badEncryptedMessage'). Either way, we can now set the
            // cleartext of the event and raise Event.decrypted.
            //
            // make sure we clear 'decryptionPromise' before sending the 'Event.decrypted' event,
            // otherwise the app will be confused to see `isBeingDecrypted` still set when
            // there isn't an `Event.decrypted` on the way.
            //
            // see also notes on retryDecryption above.
            //
            this.decryptionPromise = null
            this.retryDecryption = false
            this.setClearData(res)

            // Before we emit the event, clear the push actions so that they can be recalculated
            // by relevant code. We do this because the clear event has now changed, making it
            // so that existing rules can be re-run over the applicable properties. Stuff like
            // highlighting when the user's name is mentioned rely on this happening. We also want
            // to set the push actions before emitting so that any notification listeners don't
            // pick up the wrong contents.

            // todo jterzis: implement push notifications here

            if (options.emit !== false) {
                this.emitter?.emit('eventDecrypted', this, err)
            }

            return
        }
    }

    /**
     * Get the (decrypted) type of event content.
     *
     * @returns The event type, e.g. `channelMessage`
     */
    public getType(): string | undefined {
        if (this.clearEvent && this.clearEvent.type) {
            return this.clearEvent.type
        }
        return
    }

    /**
     * Update the cleartext content of this event.
     *
     * Used after decrypting an event
     */
    public setClearData(decryptionResult: ClearContent): void {
        this.clearEvent = decryptionResult
    }

    public isBeingDecrypted(): boolean {
        return this.decryptionPromise != null
    }

    public getDecryptionPromise(): Promise<void> | null {
        return this.decryptionPromise
    }

    private badEncryptedMessage(reason: string): ClearContent {
        return {
            content: undefined,
            error: { type: 'm.bad.encrypted', msg: reason },
        }
    }

    public setEmitter(emitter: TypedEmitter<RiverEventsV2>): void {
        this.emitter = emitter
    }

    public getWireContent(): EncryptedData {
        return this.encryptedEvent.content
    }

    public getContent(): ClearContent | undefined {
        return this.clearEvent || undefined
    }

    /**
     * Get a string containing details of this event
     *
     * This is intended for logging, to help trace errors. Example output:
     *
     * @example
     * ```
     * id=$HjnOHV646n0SjLDAqFrgIjim7RCpB7cdMXFrekWYAn type=m.room.encrypted
     * sender=@user:example.com room=!room:example.com ts=2022-10-25T17:30:28.404Z
     * ```
     */
    public getDetails(): string {
        return `type=${this.getType()} sender=${this.getSender()}`
    }
}
