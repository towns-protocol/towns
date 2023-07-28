import { dlog } from './dlog'
import { CryptoBackend, IEventDecryptionResult, Crypto } from './crypto/crypto'
import { StreamEvent, ToDeviceOp } from '@towns/proto'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { IEncryptedContent, OLM_ALGORITHM } from './crypto/olmLib'
import { PlainMessage } from '@bufbuild/protobuf'

const log = dlog('csb:event')

export interface IContent {
    [key: string]: any
    // not returned from the wire, used to store msg status type
    msgtype?: string
    membership?: string
    avatar_url?: string
    displayname?: string
}

export interface IPlainContent {
    payload: Record<string, string>
}

export type IBodyContent = IBodyPostContent & IBodyTextContent
export interface IBodyPostContent {
    post: { text: { body: string } }
}

export interface IBodyTextContent {
    text: { body: string }
}

export interface IClearEvent {
    space_id?: string
    channel_id?: string
    type?: RiverEventType
    // omit any fields that don't need to appear in clear event from decrypted content here
    content: IContent
}

export interface IDecryptOptions {
    // Emits "event.decrypted" if set to true
    emit?: boolean
    // True if this is a retry (enables more logging)
    isRetry?: boolean
    // whether the message should be re-decrypted if it was previously successfully decrypted with an untrusted key
    forceRedecryptIfUntrusted?: boolean
}

interface StreamEventPayload {
    parsed_event: PlainMessage<StreamEvent>['payload']
    // hash_str, creator_user_id are not available when creating an event, but are when reading one off the wire
    hash_str?: string
    creator_user_id?: string
}

export interface IEvent {
    event_id: string
    type: RiverEventType
    content: IContent
    payload: StreamEventPayload
    sender: string // user_id of sender
    stream_type: EncryptedEventStreamTypes
    room_id?: string
    origin_server_ts: number
    txn_id?: string
    membership?: string
    redacts?: string
}

export enum EventStatus {
    NOT_SENT = 'not_sent',
    ENCRYPTING = 'encrypting',
    SENDING = 'sending',
    QUEUED = 'queued',
    SENT = 'sent',
    CANCELLED = 'cancelled',
}

export enum RiverEventType {
    // Room state events
    RoomCreate = 'r.room.create',
    RoomMember = 'r.room.member',
    RoomName = 'r.room.name',
    RoomTopic = 'r.room.topic',
    RoomAvatar = 'r.room.avatar',
    RoomPinnedEvents = 'r.room.pinned_events',

    // Room timeline events
    RoomRedaction = 'r.room.redaction',
    RoomMessage = 'r.room.message',
    KeyVerificationRequest = 'r.key.verification.request',
    KeyVerificationStart = 'r.key.verification.start',
    KeyVerificationCancel = 'r.key.verification.cancel',
    KeyVerificationMac = 'r.key.verification.mac',
    KeyVerificationDone = 'r.key.verification.done',
    KeyVerificationKey = 'r.key.verification.key',
    KeyVerificationAccept = 'r.key.verification.accept',

    Reaction = 'r.reaction',

    // Room ephemeral events
    Typing = 'r.typing',
    Receipt = 'r.receipt',

    // Room encrypted event
    Encrypted = 'r.room.encrypted',

    // todo: implement
    // FullyRead = "r.fully_read",

    // to_device events
    RoomKey = 'r.room_key',
    RoomKeyRequest = 'r.room_key_request',
    ForwardedRoomKey = 'r.forwarded_room_key',
    Dummy = 'r.dummy',
}

enum RiverEventEvents {
    Decrypted = 'eventDecrypted',
    BeforeRedaction = 'eventBeforeRedaction',
    Status = 'eventStatus',
    Replaced = 'eventReplaced',
}

// store known stream payload types that can be encrypted
export enum EncryptedEventStreamTypes {
    Uknown = 'unknown',
    Channel = 'channel',
    ToDevice = 'to_device',
}

type RiverEventEmittedEventHandlerMap = {
    // these should really be RiverEvent but typescript comaplains
    // that RiverEvent is circularly referenced in base class, hence the use of object
    eventDecrypted: (event: object, err?: Error) => void
    eventBeforeRedaction: (event: object, redactionEvent: object) => void
    eventStatus: (event: object, status: EventStatus | undefined, err?: Error) => void
    eventReplaced: (event: object) => void
}

export class RiverEvent extends (EventEmitter as new () => TypedEmitter<RiverEventEmittedEventHandlerMap>) {
    private _localRedactionEvent: RiverEvent | null = null
    private _replacingEvent: RiverEvent | null = null
    private clearEvent?: IClearEvent

    /** if we have a process decrypting this event, returns a Promise
     * which resolves when the decryption completes. Typically null.
     */
    private decryptionPromise: Promise<void> | null = null
    /* flag to indicate if we should retry decrypting this event after the
     * first attempt (eg, we have received new data which means that a second
     * attempt may succeed)
     */
    private retryDecryption = false

    /**
     * Unique identifier for event, which is stable across syncs.
     */
    private txnId?: string

    /**
     * Set an appropriate timestamp on the event relative to the local clock.
     * This will by nature be an approximation that doesn't take into account
     * the age of the event from the date the node validated the event.
     */
    public localTimestamp: number

    /**
     * The curve25519 key of the sender of this event.
     */
    public senderCurve25519Key: string | undefined = undefined
    /**
     * donotuse key the sender of this event or creator claims to own.
     *
     * Note jterzis 07/19/23: The ed25519 signing key is deprecated and should not be used.
     * Instead TDK will in the future sign the curve25519 to establish chain of trust to identity.
     * See: https://linear.app/hnt-labs/issue/HNT-1767/tdk-implementation
     */
    public claimedDoNotUseKey: string | undefined = undefined

    constructor(public event: Partial<IEvent> = {}) {
        super()

        const { parsed_event, hash_str, creator_user_id } = event?.payload || {}

        this.txnId = hash_str
        this.localTimestamp = Date.now()
        if (creator_user_id) {
            this.event.sender = creator_user_id
        }

        if (!this.event.sender) {
            throw new Error('Event must have a sender user id')
        }

        // set content when event is not being created from a StreamEvent
        if (!event.content) {
            event.content = {}
        }

        const payload = parsed_event
        switch (payload?.case) {
            case `channelPayload`:
                switch (payload.value.content.case) {
                    case 'message': {
                        const content = payload.value.content.value
                        event.content['session_id'] = content.sessionId
                        event.content['ciphertext'] = content.text
                        // typically should be MEGOLM but not necessarily
                        event.content['algorithm'] = content.algorithm
                        event.content['sender_key'] = content.senderKey
                        event.stream_type = EncryptedEventStreamTypes.Channel
                        break
                    }
                    default:
                        break
                }
                break
            case `userPayload`:
                switch (payload.value.content.case) {
                    case 'toDevice': {
                        const content = payload.value.content.value
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        event.content['ciphertext'] = content.message?.ciphertext
                        event.content['algorithm'] = OLM_ALGORITHM
                        event.content['sender_key'] = content.senderKey
                        event.content['device_key'] = content.deviceKey
                        event.content['op'] = ToDeviceOp[content.op]
                        event.stream_type = EncryptedEventStreamTypes.ToDevice
                        break
                    }
                    default:
                        break
                }
                break
            default:
                break
        }
    }

    /* Get the room_id for this event.
     */
    public getRoomId(): string | undefined {
        return this.event.room_id
    }

    public getStreamType(): string | undefined {
        return this.event.stream_type
    }

    public getId(): string {
        return this.txnId ?? ''
    }

    public getSender(): string {
        // sender is required in the constructor so this case is appropriate
        return this.event.sender as string
    }

    /**
     * The curve25519 key for the device that we think sent this event
     *
     * For an Olm-encrypted event, this is inferred directly from the DH
     * exchange at the start of the session: the curve25519 key is involved in
     * the DH exchange, so only a device which holds the private part of that
     * key can establish such a session.
     *
     * For a megolm-encrypted event, it is inferred from the Olm message which
     * established the megolm session
     */
    public getSenderKey(): string | null {
        return this.senderCurve25519Key ? this.senderCurve25519Key : null
    }

    /**
     * Get the (decrypted, if necessary) type of event.
     *
     * @returns The event type, e.g. `r.room.message`
     */
    public getType(): RiverEventType | undefined {
        if (this.clearEvent) {
            return this.clearEvent.type
        }
        return this.event.type
    }

    /**
     * Replace the content of this event with encrypted versions.
     * (This is used when sending an event; it should not be used by applications).
     *
     * @internal
     *
     * @param cryptoType - type of the encrypted event
     *
     * @param cryptoContent - raw 'content' for the encrypted event.
     *
     * @param senderCurve25519Key - curve25519 key to record for the
     *   sender of this event.
     *
     * @param claimedDoNotUseKey - claimed ed25519 key to record for the
     *   sender if this event.
     */
    public makeEncrypted(
        cryptoType: RiverEventType,
        cryptoContent: IEncryptedContent,
        senderCurve25519Key: string,
        claimedDoNotUseKey: string,
    ): void {
        // keep the plain-text data for 'view source'
        this.clearEvent = {
            type: this.event.type,
            content: this.event.content || {},
        }
        this.event.type = cryptoType
        this.event.content = cryptoContent
        this.senderCurve25519Key = senderCurve25519Key
        this.claimedDoNotUseKey = claimedDoNotUseKey
    }

    public getClaimedDoNotUseKey(): string | undefined {
        return this.claimedDoNotUseKey
    }

    public isDecryptionFailure(): boolean {
        return this.clearEvent?.content?.msgtype === 'm.bad.encrypted'
    }

    public isRedacted(): boolean {
        // todo: implement
        return false
    }

    public shouldAttemptDecryption(): boolean {
        if (this.isRedacted()) {
            return false
        } else if (this.clearEvent) {
            return false
        }
        // todo: true once we have decryptionLoop implemented in this class
        return true
    }

    public async attemptDecryption(crypto: Crypto, options: IDecryptOptions = {}): Promise<void> {
        const alreadyDecrypted = this.clearEvent && !this.isDecryptionFailure()
        const forceRedecrypt = options.forceRedecryptIfUntrusted
        if (alreadyDecrypted && !forceRedecrypt) {
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

    private async decryptionLoop(
        crypto: CryptoBackend,
        options: IDecryptOptions = {},
    ): Promise<void> {
        // make sure that this method never runs completely synchronously.
        // (doing so would mean that we would clear decryptionPromise *before*
        // it is set in attemptDecryption - and hence end up with a stuck
        // `decryptionPromise`).

        // eslint-disable-next-line no-constant-condition
        while (true) {
            this.retryDecryption = false

            let res: IEventDecryptionResult
            let err: Error | undefined = undefined
            try {
                if (!crypto) {
                    res = this.badEncryptedMessage('Encryption not enabled')
                } else {
                    res = await crypto.decryptEvent(this)
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

            // todo: implement push notifications
            //this.setPushDetails()

            if (options.emit !== false) {
                this.emit(RiverEventEvents.Decrypted, this, err)
            }

            return
        }
    }

    public isBeingDecrypted(): boolean {
        return this.decryptionPromise != null
    }

    public getDecryptionPromise(): Promise<void> | null {
        return this.decryptionPromise
    }

    private badEncryptedMessage(reason: string): IEventDecryptionResult {
        return {
            clearEvent: {
                type: RiverEventType.RoomMessage,
                content: {
                    msgtype: 'm.bad.encrypted',
                    body: '** Unable to decrypt: ' + reason + ' **',
                },
            },
            encryptedDisabledForUnverifiedDevices:
                reason === `DecryptionError: ${WITHHELD_MESSAGES['m.unverified']}`,
        }
    }

    /**
     * Update the cleartext content of this event.
     *
     * Used after decrypting an event
     */
    public setClearData(decryptionResult: IEventDecryptionResult): void {
        this.clearEvent = decryptionResult.clearEvent
        this.senderCurve25519Key = decryptionResult.senderCurve25519Key
        this.claimedDoNotUseKey = decryptionResult.claimedDoNotUseKey
    }

    /**
     *  Get the possible encrypted event content JSON
     */
    public getWireContent(): IContent {
        return this.event.content || {}
    }

    /**
     * Get the (decrypted if possible) content of the event as JSON or an empty object.
     */
    public getContent<T extends IContent = IContent>(): T {
        if (this._localRedactionEvent) {
            return {} as T
        } else if (this._replacingEvent) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return this._replacingEvent.getContent<T>()['r.new_content'] || {}
        } else {
            return this.getOriginalContent()
        }
    }

    public getPlainContent(): Record<string, string> {
        const content = this.getContent()
        const result: Record<string, string> = {}

        for (const key in content) {
            if (typeof content[key] === 'string') {
                result[key] = content[key]
            } else {
                result[key] = JSON.stringify(content[key])
            }
        }
        return result
    }

    public getChannelMessageBody(): string | undefined {
        if (this.getStreamType() === EncryptedEventStreamTypes.Channel) {
            if (this.clearEvent) {
                return (
                    JSON.parse(
                        (this.clearEvent.content as unknown as Record<string, string>)['post'],
                    ) as IBodyContent
                ).text.body
            } else {
                return (JSON.parse(this.getPlainContent()['ciphertext']) as IBodyContent).post.text
                    .body
            }
        }
        return undefined
    }

    public getOriginalContent<T = IContent>(): T {
        if (this._localRedactionEvent) {
            return {} as T
        }
        if (this.clearEvent) {
            return (this.clearEvent.content || {}) as T
        }
        return (this.event.content || {}) as T
    }

    /**
     *  Get the cleartext content for this event. If the event is not encrypted,
     *  or encryption has not been completed, this will return undefined.
     */
    public getClearContent(): IContent | undefined {
        return this.clearEvent ? this.clearEvent.content : undefined
    }

    /**
     * Get the (possibly encrypted) type of the event that will be sent to the
     * homeserver.
     *
     * @returns The event type.
     */
    public getWireType(): RiverEventType | undefined {
        if (this.event?.type) {
            return this.event.type
        }
        return
    }

    /**
     * Get the timestamp of this event, as a Date object.
     * @returns The event date, e.g. `new Date(1433502692297)`
     */
    public getDate(): Date | null {
        return this.event.origin_server_ts ? new Date(this.event.origin_server_ts) : null
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
        return `type=${this.getWireType()} sender=${this.getSender()}`
    }
}

export const WITHHELD_MESSAGES: Record<string, string> = {
    'm.unverified': 'The sender has disabled encrypting to unverified devices.',
    'm.blacklisted': 'The sender has blocked you.',
    'm.unauthorised': 'You are not authorised to read the message.',
    'm.no_olm': 'Unable to establish a secure channel.',
}

/** Event Mapper types below
 *
 */
