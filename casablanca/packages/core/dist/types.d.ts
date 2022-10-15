export declare enum StreamKind {
    User = "user",
    Space = "space",
    Channel = "channel"
}
export declare enum SteamPrefix {
    User = "zuser-",
    Space = "zspace-",
    Channel = "zchannel-"
}
export declare const allowedStreamPrefixes: () => string[];
export declare const makeStreamId: (prefix: SteamPrefix, identity: string) => string;
export declare const makeUserStreamId: (identity: string) => string;
export declare const makeSpaceStreamId: (identity: string) => string;
export declare const makeChannelStreamId: (identity: string) => string;
export declare const isUserStreamId: (streamId: string) => boolean;
export declare const isSpaceStreamId: (streamId: string) => boolean;
export declare const isChannelStreamId: (streamId: string) => boolean;
export declare const isValidStreamId: (streamId: string) => boolean;
export interface EventRef {
    streamId: string;
    hash: string;
    signature: string;
    creatorAddress: string;
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
    eventRef: EventRef;
}
export interface UserInceptionData {
    streamKind: StreamKind.User;
}
export interface SpaceInceptionData {
    streamKind: StreamKind.Space;
}
export interface ChannelInceptionData {
    streamKind: StreamKind.Channel;
    spaceId: string;
}
declare type InceptionData = UserInceptionData | SpaceInceptionData | ChannelInceptionData;
export interface InceptionPayload {
    kind: 'inception';
    streamId: string;
    data: InceptionData;
}
export interface UserInvitedToStreamPayload extends DerivedEventPayload {
    kind: 'user-invited';
    streamId: string;
    inviterId: string;
}
export interface UserJoinedStreamPayload extends DerivedEventPayload {
    kind: 'user-joined';
    streamId: string;
}
export interface UserLeftStreamPayload extends DerivedEventPayload {
    kind: 'user-left';
    streamId: string;
}
declare type UserStreamPayload = InceptionPayload | UserInvitedToStreamPayload | UserJoinedStreamPayload | UserLeftStreamPayload;
export interface InviteUserPayload {
    kind: 'invite';
    userId: string;
}
export interface JoinStreamPayload {
    kind: 'join';
    userId: string;
}
export interface LeaveStreamPayload {
    kind: 'leave';
    userId: string;
}
export declare type JoinableStreamPayload = InceptionPayload | InviteUserPayload | JoinStreamPayload | LeaveStreamPayload;
export interface CreateChannelPayload extends DerivedEventPayload {
    kind: 'channel-created';
    channelId: string;
}
export interface DeleteChannelPayload extends DerivedEventPayload {
    kind: 'channel-deleted';
    channelId: string;
}
export declare type SpaceStreamPayload = JoinableStreamPayload | CreateChannelPayload | DeleteChannelPayload;
export interface MessagePayload {
    kind: 'message';
    text?: string;
}
export declare type ChannelStreamPayload = JoinableStreamPayload | MessagePayload;
export declare type Payload = UserStreamPayload | SpaceStreamPayload | ChannelStreamPayload;
export declare type PayloadKind = Payload['kind'];
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
    hash: string;
    /**
     * Signature in the form 0x1234
     * For the event to be valid, signature must match event.creatorAddress.
     */
    signature: string;
    base: BaseEvent;
}
/**
 * TypedFullEvent is a convenience type that allows to narrow the type of payload
 * to declare functions that accept events with only specific types of payloads.
 */
export interface TypedFullEvent<T> extends Omit<FullEvent, 'base'> {
    base: TypedBaseEvent<T>;
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
     * For the event to be valid, creatorAddress must match the signature.
     */
    creatorAddress: string;
    /** Salt ensures that similar messages are not hashed to the same value. nanoid may be used. */
    salt: string;
    /** Hashes of the preceding leaf events in the stream. Empty array for the inception event. */
    prevEvents: string[];
    /** Variable-type payload. */
    payload: Payload;
}
/**
 * TypedBaseEvent is a convenience type that allows to narrow the type of payload
 * to declare functions that accept events with only specific types of payloads.
 */
export interface TypedBaseEvent<T> extends Omit<BaseEvent, 'payload'> {
    payload: Extract<T, Payload>;
}
export interface CreateEventStreamParams {
    events: FullEvent[];
}
export interface CreateEventStreamResult {
    syncCookie: string;
}
export declare type CreateUserParams = CreateEventStreamParams;
export declare type CreateUserResult = CreateEventStreamResult;
export declare type CreateSpaceParams = CreateEventStreamParams;
export declare type CreateSpaceResult = CreateEventStreamResult;
export declare type CreateChannelParams = CreateEventStreamParams;
export declare type CreateChannelResult = CreateEventStreamResult;
export interface StreamAndCookie {
    events: FullEvent[];
    syncCookie: string;
    originalSyncCookie?: string;
}
export interface GetEventStreamParams {
    streamId: string;
}
export interface GetEventStreamResult extends StreamAndCookie {
}
export interface AddEventParam {
    streamId: string;
    event: FullEvent;
}
export interface AddEventResult {
}
export interface SyncPos {
    streamId: string;
    syncCookie: string;
}
export interface SyncStreamsParams {
    syncPositions: SyncPos[];
    timeoutMs?: number;
}
export interface StreamsAndCookies {
    [streamId: string]: StreamAndCookie;
}
export interface SyncStreamsResult {
    streams: StreamsAndCookies;
}
export declare class ZionServicePrototype {
    createUser(params: CreateUserParams): Promise<CreateUserResult>;
    createSpace(params: CreateSpaceParams): Promise<CreateSpaceResult>;
    createChannel(params: CreateChannelParams): Promise<CreateChannelResult>;
    getEventStream(params: GetEventStreamParams): Promise<GetEventStreamResult>;
    addEvent(params: AddEventParam): Promise<AddEventResult>;
    syncStreams(params: SyncStreamsParams): Promise<SyncStreamsResult>;
}
export interface ZionServiceInterface extends ZionServicePrototype {
}
export declare enum Action {
    CreateSpace = "createSpace",
    CreateChannel = "createChannel",
    Invite = "invite",
    Join = "join",
    Read = "read",
    Post = "post"
}
export interface ActionGuard {
    isAllowed(actor: string, action: Action, object?: string): Promise<boolean>;
}
export {};
//# sourceMappingURL=types.d.ts.map