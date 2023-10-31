import { dlog } from './dlog'
import { CryptoBackend, IEventDecryptionResult, Crypto, IRoomKeyRequestBody } from './crypto/crypto'
import {
    ChannelMessage,
    EncryptedData,
    EncryptedDeviceData,
    StreamEvent,
    ToDeviceMessage,
    ToDeviceMessage_KeyRequest,
    ToDeviceMessage_KeyResponse,
    ToDeviceOp,
    UserPayload_ToDevice,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import {
    IMegolmEncryptedContent,
    IOlmEncryptedContent,
    MEGOLM_ALGORITHM,
    OLM_ALGORITHM,
} from './crypto/olmLib'
import { Message, PlainMessage } from '@bufbuild/protobuf'
import { ParsedEvent } from './types'

const log = dlog('csb:event')

// Type guards for IChannelContent and IToDeviceContent
function isChannelContent(content: any): content is Partial<IChannelContent> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const cipher = content.ciphertext
    return (
        'content' in content &&
        'ciphertext' in content &&
        'algorithm' in content &&
        typeof cipher == 'string'
    )
}

function isToDeviceContent(content: any): content is Partial<IToDeviceContent> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const cipher = content.ciphertext
    return (
        'content' in content &&
        'ciphertext' in content &&
        'algorithm' in content &&
        typeof cipher == 'object'
    )
}

// Type guards for IChannelContent['content'] and IToDeviceContent['content']
function isChannelContentPlainMessage(content: any): content is IChannelContent['content'] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const content_case = content.case
    return (
        'case' in content &&
        (content_case === 'post' ||
            content_case === 'reaction' ||
            content_case === 'redaction' ||
            content_case === 'edit') &&
        'value' in content
    )
}

export function isToDevicePlainMessage(content: any): content is IToDeviceContent['content'] {
    return (
        'case' in content &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (content.case === 'request' || content.case === 'response') &&
        'value' in content
    )
}

export function isToDevicePlainMessagePayload(
    content: any,
): content is PlainMessage<ToDeviceMessage> {
    return (
        'payload' in content &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (content.payload.case === 'request' || content.payload.case === 'response')
    )
}

export function isUserPayload_ToDevicePlainMessage(
    content: any,
): content is PlainMessage<UserPayload_ToDevice>['message'] {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return 'ciphertext' in content && typeof content.ciphertext == 'object'
}

function isClearEvent(content: any): content is IClearEvent {
    return (
        'content' in content &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ('value' in content.content || 'msgtype' in content.content)
    )
}

// Type guard for IContentContent
export function isChannelOrToDeviceContent(
    content: IContentContent,
): content is Partial<IChannelContent> | Partial<IToDeviceContent> {
    return isChannelContent(content) || isToDeviceContent(content)
}

type IEncryptedContent = IMegolmEncryptedContent | IOlmEncryptedContent

export type IClearContent =
    | (PlainMessage<ChannelMessage>['payload'] | PlainMessage<ToDeviceMessage>['payload']) &
          Partial<IContentOpts>

export type IContentOpts = {
    msgtype?: string
    membership?: string
    avatar_url?: string
    displayname?: string
    // used for error messages and generally body messages appending by class
    body?: string
}

export interface IChannelContent {
    content: PlainMessage<ChannelMessage>['payload']
    ciphertext: PlainMessage<EncryptedData>['text']
    algorithm: string
    sender_key: string
    device_id: string
    session_id: string
}

export interface IToDeviceContent {
    content: PlainMessage<ToDeviceMessage>['payload']
    ciphertext: PlainMessage<EncryptedDeviceData>['ciphertext']
    algorithm: string
    device_key: string
    sender_key: string
    op: string
}

export interface IContent {
    content: Partial<IChannelContent> | Partial<IToDeviceContent>
    // used to store msg status type post-decryption attempt
    msgtype?: string
    membership?: string
    avatar_url?: string
    displayname?: string
    code?: string
    reason?: string
    // note jterzis: used for IncomingRoomKeyRequest, may not need these fields
    requesting_device_id?: string
    request_id?: string
    request_body?: IRoomKeyRequestBody
}

type IContentContent = IContent['content']

export type ClearContent = {
    payload: IChannelContent['content'] | undefined
    opts: IContentOpts | undefined
}

export interface IPlainContent {
    payload: Record<string, string>
}

export interface IBodyPostTextContent {
    post: { text: { body: string } }
}

export interface IClearEvent {
    space_id?: string
    channel_id?: string
    type?: RiverEventType
    // omit any fields that don't need to appear in clear event from decrypted content here
    content: Partial<IClearContent>
}

export interface IDecryptOptions {
    // Emits "event.decrypted" if set to true
    emit?: boolean
    emitter?: TypedEmitter<RiverEvents>
    // True if this is a retry (enables more logging)
    isRetry?: boolean
}

interface StreamEventPayload {
    // parsed_event is a plain message of proto payload defined in protocol.proto or payloads.proto
    // depending on whether RiverEvent is instantiated with encrypted (server-side) or decrypted (client-side) data.
    parsed_event:
        | StreamEvent['payload']
        | PlainMessage<StreamEvent>['payload']
        | PlainMessage<ChannelMessage>['payload']
        | PlainMessage<ToDeviceMessage>['payload']
    // hash_str, creator_user_id are not available when creating an event, but are when reading one off the wire
    hash_str?: string
    creator_user_id?: string
    stream_id?: string
}

export interface IEvent {
    event_id: string
    type: RiverEventType
    content: IContent
    payload: StreamEventPayload
    sender: string // user_id of sender
    stream_type: EncryptedEventStreamTypes
    channel_id?: string
    space_id?: string
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

// store known stream payload types that can be encrypted
export enum EncryptedEventStreamTypes {
    Uknown = 'unknown',
    Channel = 'channelPayload',
    ToDevice = 'userPayload',
}

export type RiverEvents = {
    eventDecrypted: (event: RiverEvent, err?: Error) => void
}

export class RiverEvent {
    private _localRedactionEvent: RiverEvent | null = null
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

    constructor(
        public event: Partial<IEvent> = {},
        private emitter?: TypedEmitter<RiverEvents>,
        public wireEvent?: ParsedEvent,
    ) {
        const { parsed_event, hash_str, creator_user_id } = event?.payload || {}

        this.txnId = hash_str
        this.localTimestamp = Date.now()
        if (creator_user_id) {
            this.event.sender = creator_user_id
        }

        if (!this.event.sender) {
            throw new Error('Event must have a sender user id')
        }

        const payload = parsed_event
        switch (payload?.case) {
            case `channelPayload`:
                switch (payload.value.content.case) {
                    case 'message': {
                        // encrypted channel contents from protocol.proto
                        const content = payload.value.content.value
                        if (!event.content) {
                            event.content = {} as IContent
                        }
                        event.content.content = {
                            session_id: content.sessionId,
                            ciphertext: content.text,
                            algorithm: content.algorithm,
                            sender_key: content.senderKey,
                            device_id: content.deviceId,
                            content: {} as PlainMessage<ChannelMessage>['payload'],
                        }
                        event.stream_type = EncryptedEventStreamTypes.Channel
                        break
                    }
                    default:
                        break
                }
                break
            case 'dmChannelPayload':
                switch (payload.value.content.case) {
                    case 'message': {
                        // encrypted channel contents from protocol.proto
                        const content = payload.value.content.value
                        if (!event.content) {
                            event.content = {} as IContent
                        }
                        event.content.content = {
                            session_id: content.sessionId,
                            ciphertext: content.text,
                            algorithm: content.algorithm,
                            sender_key: content.senderKey,
                            device_id: content.deviceId,
                            content: {} as PlainMessage<ChannelMessage>['payload'],
                        }
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
                        // encrypted toDevice contents from protocol.proto
                        const content = payload.value.content.value
                        if (!event.content) {
                            event.content = {} as IContent
                        }
                        if (!content.message) {
                            throw new Error('ToDevice message is missing message content')
                        }
                        event.content.content = {
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            ciphertext: content.message?.ciphertext,
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            algorithm: content.message?.algorithm ?? OLM_ALGORITHM,
                            sender_key: content.senderKey,
                            device_key: content.deviceKey,
                            op: ToDeviceOp[content.op],
                            content: {} as PlainMessage<ToDeviceMessage>['payload'],
                        }
                        event.stream_type = EncryptedEventStreamTypes.ToDevice
                        break
                    }
                    default:
                        break
                }
                break
            // decrypted channel contents from payloads.proto
            case 'post':
            case 'reaction':
            case 'edit':
            case 'redaction': {
                const content = payload.value
                if (!event.content) {
                    event.content = {} as IContent
                }
                if (!event.content.content) {
                    event.content.content = {} as Partial<IChannelContent>
                }
                event.content.content.content = {
                    case: payload.case,
                    value: content,
                } as PlainMessage<ChannelMessage>['payload']
                event.content.content.algorithm = MEGOLM_ALGORITHM
                event.stream_type = EncryptedEventStreamTypes.Channel
                break
            }
            // decrypted toDevice contents from payloads.proto
            case 'request':
            case 'response': {
                const content = payload.value
                if (!event.content) {
                    event.content = {} as IContent
                }
                if (!event.content.content) {
                    event.content.content = {} as Partial<IToDeviceContent>
                }
                event.content.content = {
                    content: {
                        case: payload.case,
                        value: content,
                    } as PlainMessage<ToDeviceMessage>['payload'],
                }
                event.content.content.algorithm = OLM_ALGORITHM
                event.stream_type = EncryptedEventStreamTypes.ToDevice
                break
            }
            default:
                break
        }
    }

    public getChannelId(): string | undefined {
        return this.event.channel_id
    }

    public getSpaceId(): string | undefined {
        return this.event.space_id
    }

    public getStreamType(): string | undefined {
        return this.event.stream_type
    }

    public getStreamId(): string | undefined {
        return this.event?.payload?.stream_id
    }

    public getId(): string | undefined {
        return this.txnId
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
     */
    public makeEncrypted(
        cryptoType: RiverEventType,
        cryptoContent: IEncryptedContent,
        senderCurve25519Key: string,
    ): void {
        // keep the plain-text data for 'view source'
        this.clearEvent = {
            type: this.event.type,
            content: this.event.content?.content.content || {},
        }
        this.event.type = cryptoType
        if (!this.event.content) {
            throw new Error('Event must have content')
        }
        this.event.content.content.ciphertext = cryptoContent.ciphertext
        this.event.content.content.algorithm = cryptoContent.algorithm
        // todo: fix this!
        if ((cryptoContent as IMegolmEncryptedContent).session_id !== undefined) {
            ;(this.event.content.content as Partial<IChannelContent>).session_id = (
                cryptoContent as IMegolmEncryptedContent
            ).session_id
        }

        this.senderCurve25519Key = senderCurve25519Key
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

    public shouldAttemptEncryption(): boolean {
        const content = this.getWireContent()
        if (content.content?.ciphertext !== undefined) {
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

            // todo jterzis: implement push notifications here

            if (options.emit !== false) {
                this.emitter?.emit('eventDecrypted', this, err)
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
    }

    public setEmitter(emitter: TypedEmitter<RiverEvents>): void {
        this.emitter = emitter
    }

    /**
     *  Get the possible encrypted event content JSON
     */
    public getWireContent(): Partial<IContent> {
        return this.event.content || {}
    }

    public getTypedWireContent(): {
        content: IContentContent
    } & IContentOpts {
        const orig_content = this.getWireContent()
        const { content, ...rest } = orig_content
        if (!content) {
            return { content: {} as IContentContent, ...rest }
        }
        return { content: content, ...rest }
    }

    public getWireContentChannel(): { content: Partial<IChannelContent> } & IContentOpts {
        const { content, ...rest } = this.getTypedWireContent()
        if (isChannelContent(content)) {
            return { content, ...rest }
        }
        return {} as { content: Partial<IChannelContent> } & IContentOpts
    }

    public getWireContentToDevice(): { content: Partial<IToDeviceContent> } & IContentOpts {
        const { content, ...rest } = this.getTypedWireContent()
        if (isToDeviceContent(content)) {
            return { content, ...rest }
        }
        return {} as { content: Partial<IToDeviceContent> } & IContentOpts
    }

    /**
     * Get the (decrypted if available) content of the event as JSON or an empty object.
     */
    public getContent<T extends IContent = IContent>(): T {
        // todo: handle replacing events here as well
        if (this._localRedactionEvent) {
            return {} as T
        } else {
            return this.getOriginalContent()
        }
    }

    // get ToDevice clear content from decrypted event or informational/error message
    public getClearContent_ToDevice():
        | { content: IToDeviceContent['content'] | undefined; opts: IContentOpts | undefined }
        | undefined {
        const content = this.getContent()
        if (isClearEvent(content)) {
            if (content.content?.msgtype !== undefined && content.content?.body !== undefined) {
                // return IContentOpts if msgtype and body are set on clear event
                return {
                    opts: { ...content?.content },
                    content: undefined,
                }
            }
            if (isToDevicePlainMessage(content.content)) {
                return { content: content.content, opts: undefined }
            }
        }
        return
    }

    // Get ChannelMessage clear content from decrypted event or informational/error message
    public getClearContent_ChannelMessage(): ClearContent {
        const content = this.getContent()
        if (isClearEvent(content)) {
            if (content.content?.msgtype !== undefined && content.content?.body !== undefined) {
                // return IContentOpts if msgtype and body are set on clear event
                return {
                    opts: { ...content?.content },
                    payload: undefined,
                }
            }
            if (isChannelContentPlainMessage(content.content)) {
                return { payload: content.content, opts: undefined }
            }
        }
        return { payload: undefined, opts: undefined }
    }

    public getWireContent_fromJsonString<T extends Message<T>>(constructor: {
        new (): T
    }): T | undefined {
        const plainContent = this.getContent().content.ciphertext
        if (typeof plainContent !== 'string') {
            return
        }
        try {
            const newT = new constructor()
            const content = newT.fromJsonString(plainContent)
            return content
        } catch (e) {
            log(`Error parsing wire content: ${(e as Error).message}`)
            return
        }
    }

    public getClearToDeviceMessage_KeyResponse(): ToDeviceMessage_KeyResponse | undefined {
        const content = this.getClearContent_ToDevice()
        if (content?.content && content.content?.value) {
            if (content?.content?.case === 'response') {
                return new ToDeviceMessage_KeyResponse(content?.content.value)
            }
        }
        return
    }

    public getClearToDeviceMessage_KeyRequest(): ToDeviceMessage_KeyRequest | undefined {
        const content = this.getClearContent_ToDevice()
        if (content?.content && content.content?.value) {
            if (content?.content?.case === 'request') {
                return new ToDeviceMessage_KeyRequest(content?.content.value)
            }
        }
        return
    }

    public getContentToDevice(): {
        content: IToDeviceContent['content'] | undefined
        clear: Partial<IClearEvent> | undefined
    } {
        const content = this.getContent()
        if (isClearEvent(content)) {
            const clearContent = content
            const plainContent = this.event?.content?.content
            return {
                content:
                    plainContent?.content && isToDeviceContent(plainContent)
                        ? plainContent.content
                        : undefined,
                clear: clearContent,
            }
        }
        if (isToDeviceContent(content.content)) {
            if (content.content.content && Object.keys(content?.content?.content).length > 0) {
                return { content: content.content.content, clear: undefined }
            }
        }
        if (isToDevicePlainMessage(content.content)) {
            return { content: content.content, clear: undefined }
        }
        return { content: undefined, clear: undefined }
    }

    public getContentChannel(): {
        content: IChannelContent['content'] | undefined
        clear: Partial<IClearEvent> | undefined
    } {
        const content = this.getContent()
        if (isClearEvent(content)) {
            const clearContent = content
            const plainContent = this.event?.content?.content
            return {
                content:
                    plainContent?.content && isChannelContent(plainContent)
                        ? plainContent.content
                        : undefined,
                clear: clearContent,
            }
        }
        if (isChannelContent(content.content)) {
            if (content.content.content && Object.keys(content?.content?.content).length > 0) {
                return { content: content.content.content, clear: undefined }
            }
        }
        if (isChannelContentPlainMessage(content.content)) {
            return { content: content.content, clear: undefined }
        }
        return { content: undefined, clear: undefined }
    }

    public getTypedContent():
        | {
              content: IChannelContent['content'] | IToDeviceContent['content']
          }
        | undefined {
        const content = this.getContent()
        if (isClearEvent(content)) {
            log('getTypedContent: content is clear event')
            return
        }
        if (isChannelContentPlainMessage(content.content.content)) {
            if (content.content.content) {
                return { content: content.content.content }
            }
        }
        if (isToDevicePlainMessage(content.content.content)) {
            if (content.content.content) {
                return { content: content.content.content }
            }
        }
        return
    }

    public getOriginalContent<T = IContent>(): T {
        if (this._localRedactionEvent) {
            return {} as T
        }
        if (this.clearEvent) {
            return (this.clearEvent || {}) as T
        }
        return (this.event.content || {}) as T
    }

    /**
     *  Get the cleartext content for this event. If the event is not encrypted,
     *  or encryption has not been completed, this will return undefined.
     */
    public getClearContent(): Partial<IClearContent> | undefined {
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
    'r.unverified': 'The sender has disabled encrypting to unverified devices.',
    'r.blacklisted': 'The sender has blocked you.',
    'r.unauthorised': 'You are not authorised to read the message.',
    'r.no_olm': 'Unable to establish a secure channel.',
}

/** Event Mapper types below
 *
 */
