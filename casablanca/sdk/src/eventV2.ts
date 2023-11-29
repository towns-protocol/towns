import { ChannelMessage, EncryptedData } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'

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
    decryptionPromise: Promise<void> | null = null

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

    public emitDecrypted(err?: Error): void {
        this.emitter?.emit('eventDecrypted', this, err)
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

    static badEncryptedMessage(reason: string): ClearContent {
        return {
            content: undefined,
            error: { type: 'm.bad.encrypted', msg: reason },
        }
    }
}
