export enum StreamKind {
    User = 'user',
    Space = 'space',
    Channel = 'channel',
}

// Stream kind is set in inception payload explicitely as StreamKind in data.streamKind field.
// Stream ids are prefixed with the kind of the stream to make it easier to
// reason about data in logs, tests, etc.
export enum SteamPrefix {
    User = 'zuser-',
    Space = 'zspace-',
    Channel = 'zchannel-',
}

export const allowedStreamPrefixes = (): string[] => Object.values(SteamPrefix)

export const makeStreamId = (prefix: SteamPrefix, identity: string): string => prefix + identity

export const makeUserStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.User, identity)
export const makeSpaceStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.Space, identity)
export const makeChannelStreamId = (identity: string): string =>
    makeStreamId(SteamPrefix.Channel, identity)

export const isUserStreamId = (streamId: string): boolean => streamId.startsWith(SteamPrefix.User)
export const isSpaceStreamId = (streamId: string): boolean => streamId.startsWith(SteamPrefix.Space)
export const isChannelStreamId = (streamId: string): boolean =>
    streamId.startsWith(SteamPrefix.Channel)

export const isValidStreamId = (streamId: string): boolean =>
    allowedStreamPrefixes().some((prefix) => streamId.startsWith(prefix))

export interface EventRef {
    streamId: string
    hash: string
    signature: string
    creatorAddress: string // TODO: remove this field
}

/**
 * Derived event is produces by server when there should be additional event to compliment
 * received event. For example, when user joins a space through event in the space stream, server will produce a derived event
 * in a user stream to indicate that user joined a particual space.
 *
 * DerivedEventPayload is a base payload of the derived event. It contains reference to the event
 * that caused the derived event to be produced.
 */
export interface DerivedEventPayload {
    eventRef: EventRef
}

// Common payloads for all streams
export interface UserInceptionData {
    streamKind: StreamKind.User
}

export interface SpaceInceptionData {
    streamKind: StreamKind.Space
}

export interface ChannelInceptionData {
    streamKind: StreamKind.Channel
    spaceId: string
}

type InceptionData = UserInceptionData | SpaceInceptionData | ChannelInceptionData

export interface InceptionPayload {
    kind: 'inception'
    streamId: string
    data: InceptionData
}

// Payloads specific to user stream
export interface UserInvitedToStreamPayload extends DerivedEventPayload {
    kind: 'user-invited'
    streamId: string
    inviterId: string
}

export interface UserJoinedStreamPayload extends DerivedEventPayload {
    kind: 'user-joined'
    streamId: string
}

export interface UserLeftStreamPayload extends DerivedEventPayload {
    kind: 'user-left'
    streamId: string
}

type UserStreamPayload =
    | InceptionPayload
    | UserInvitedToStreamPayload
    | UserJoinedStreamPayload
    | UserLeftStreamPayload

// Payloads specific to joinable streams (space and channel)
export interface InviteUserPayload {
    kind: 'invite'
    userId: string
}

export interface JoinStreamPayload {
    kind: 'join'
    userId: string
}

export interface LeaveStreamPayload {
    kind: 'leave'
    userId: string
}

export type JoinableStreamPayload =
    | InceptionPayload
    | InviteUserPayload
    | JoinStreamPayload
    | LeaveStreamPayload

// Payloads specific to space stream
export interface CreateChannelPayload extends DerivedEventPayload {
    kind: 'channel-created'
    channelId: string
}

// TODO: what does it mean to delete a channel? Same for space.
export interface DeleteChannelPayload extends DerivedEventPayload {
    kind: 'channel-deleted'
    channelId: string
}

export type SpaceStreamPayload = JoinableStreamPayload | CreateChannelPayload | DeleteChannelPayload

// Payloads specific to channel stream
export interface MessagePayload {
    kind: 'message'
    text?: string // TODO: rename to content
}

export type ChannelStreamPayload = JoinableStreamPayload | MessagePayload

// All possible payloads
export type Payload = UserStreamPayload | SpaceStreamPayload | ChannelStreamPayload
export type PayloadKind = Payload['kind']

/**
 * FullEvent is a hashed and signed event.
 * hash is used as event id. Subsequent events reference this event by hash.
 */
export interface FullEvent {
    /**
     * Hash of BaseEvent formatted as 0x1234abcd
     * While hash can be recalculated from the BaseEvent, having it here explicitely
     * makes it easier to work with event.
     * For the event to be valid, must match hash of BaseEvent.
     */
    hash: string

    /**
     * Signature in the form 0x1234
     * For the event to be valid, signature must match base.creatorAddress or
     * be signed by base.delegateSig.
     */
    signature: string

    base: BaseEvent
}

/**
 * TypedFullEvent is a convenience type that allows to narrow the type of payload
 * to declare functions that accept events with only specific types of payloads.
 */
export interface TypedFullEvent<T> extends Omit<FullEvent, 'base'> {
    base: TypedBaseEvent<T>
}

/**
 * BaseEvent contains all the fields that need to be hashed and signed
 * for the event to be valid.
 */
export interface BaseEvent {
    /**
     * Address in the form 0xABcD...
     * Checksummed according to EIP-55.
     * Creator address can be recovered from the signature, but having
     * it explicitly in the event makes it easier to work with the event.
     * For the event to be valid:
     * If delegateSig is present, creatorAddress must match delegateSig.
     * If delegateSig is not present, creatorAddress must match event signature.
     */
    creatorAddress: string

    /**
     * Signature that signs public key of the keypair that is used to sign the event.
     * If present, creatorAddress must match delegateSig and
     * FullEvent.signature's public key must be signed by delegateSig.
     *
     * delegateSig is used to delegate signing authority to another address.
     * Specifically, it is used to delegate signing authority to a Zion-managed
     * keypair from the user's wallet.
     *
     * Server nodes sign node-produced events with their own keypair and do not
     * need to use delegateSig.
     */
    delegageSig?: string

    /** Salt ensures that similar messages are not hashed to the same value. nanoid may be used. */
    salt: string

    /** Hashes of the preceding leaf events in the stream. Empty array for the inception event. */
    prevEvents: string[]

    /** Variable-type payload. */
    payload: Payload
}

/**
 * TypedBaseEvent is a convenience type that allows to narrow the type of payload
 * to declare functions that accept events with only specific types of payloads.
 */
export interface TypedBaseEvent<T> extends Omit<BaseEvent, 'payload'> {
    payload: Extract<T, Payload>
}

export interface CreateEventStreamParams {
    events: FullEvent[]
}

export interface CreateEventStreamResult {
    syncCookie: string
}

export type CreateUserParams = CreateEventStreamParams
export type CreateUserResult = CreateEventStreamResult

export type CreateSpaceParams = CreateEventStreamParams
export type CreateSpaceResult = CreateEventStreamResult

export type CreateChannelParams = CreateEventStreamParams
export type CreateChannelResult = CreateEventStreamResult

export interface StreamAndCookie {
    events: FullEvent[]
    syncCookie: string
    originalSyncCookie?: string
}

export interface GetEventStreamParams {
    streamId: string
}

export interface GetEventStreamResult extends StreamAndCookie {}

export interface AddEventParam {
    streamId: string
    event: FullEvent
}

export interface AddEventResult {}

export interface SyncPos {
    streamId: string
    syncCookie: string
}

export interface SyncStreamsParams {
    syncPositions: SyncPos[]
    timeoutMs?: number
}

export interface StreamsAndCookies {
    [streamId: string]: StreamAndCookie
}
export interface SyncStreamsResult {
    streams: StreamsAndCookies
}

export class ZionServicePrototype {
    async createUser(params: CreateUserParams): Promise<CreateUserResult> {
        throw new Error('Do not use service prototype')
    }

    async createSpace(params: CreateSpaceParams): Promise<CreateSpaceResult> {
        throw new Error('Do not use service prototype')
    }

    async createChannel(params: CreateChannelParams): Promise<CreateChannelResult> {
        throw new Error('Do not use service prototype')
    }

    async getEventStream(params: GetEventStreamParams): Promise<GetEventStreamResult> {
        throw new Error('Do not use service prototype')
    }

    async addEvent(params: AddEventParam): Promise<AddEventResult> {
        throw new Error('Do not use service prototype')
    }

    async syncStreams(params: SyncStreamsParams): Promise<SyncStreamsResult> {
        throw new Error('Do not use service prototype')
    }
}

export interface ZionServiceInterface extends ZionServicePrototype {}

export enum Action {
    CreateSpace = 'createSpace',
    CreateChannel = 'createChannel',
    Invite = 'invite',
    Join = 'join',
    Read = 'read',
    Post = 'post',
}
export interface ActionGuard {
    isAllowed(actor: string, action: Action, object?: string): Promise<boolean>
}
