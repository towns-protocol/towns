import { dlog, dlogError, bin_toHexString, check } from '@towns-protocol/dlog'
import { isDefined, logNever } from './check'
import {
    ChannelMessage,
    Err,
    SnapshotCaseType,
    SyncCookie,
    Snapshot,
    MiniblockHeader,
} from '@towns-protocol/proto'
import TypedEmitter from 'typed-emitter'
import {
    ConfirmedEvent,
    ConfirmedTimelineEvent,
    LocalEventStatus,
    LocalTimelineEvent,
    ParsedEvent,
    ParsedMiniblock,
    RemoteTimelineEvent,
    StreamTimelineEvent,
    isConfirmedEvent,
    isDecryptedEvent,
    isLocalEvent,
    makeRemoteTimelineEvent,
} from './types'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { StreamStateView_Members } from './streamStateView_Members'
import { StreamStateView_Media } from './streamStateView_Media'
import { StreamStateView_GDMChannel } from './streamStateView_GDMChannel'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_DMChannel } from './streamStateView_DMChannel'
import {
    genLocalId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isMediaStreamId,
    isSpaceStreamId,
    isUserDeviceStreamId,
    isUserSettingsStreamId,
    isUserStreamId,
    isUserInboxStreamId,
} from './id'
import { StreamStateView_UserInbox } from './streamStateView_UserInbox'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamStateView_UnknownContent } from './streamStateView_UnknownContent'
import { StreamStateView_MemberMetadata } from './streamStateView_MemberMetadata'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'
import { StreamEvents, StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import isEqual from 'lodash/isEqual'
import { DecryptionSessionError, EventSignatureBundle } from '@towns-protocol/encryption'
import { migrateSnapshot } from './migrations/migrateSnapshot'
import { LoadedStream2 } from './streamsService'
import { MiniblockSpan } from './streamsServiceStore'

const log = dlog('csb:streams')
const logError = dlogError('csb:streams:error')
const logWarning = dlog('csb:streams:warning', { defaultEnabled: true })

// it's very important that the Stream is the emitter for all events
// for any mutations, go through the stream
export interface IStreamStateView {
    readonly streamId: string
    readonly userId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: StreamTimelineEvent[]
    readonly events: Map<string, StreamTimelineEvent>
    isInitialized: boolean
    prevMiniblockHash?: Uint8Array
    lastEventNum: bigint
    syncCookie?: SyncCookie
    saveSnapshots?: boolean
    membershipContent: StreamStateView_Members
    miniblockSpan?: MiniblockSpan
    terminus?: boolean
    get spaceContent(): StreamStateView_Space
    get channelContent(): StreamStateView_Channel
    get dmChannelContent(): StreamStateView_DMChannel
    get gdmChannelContent(): StreamStateView_GDMChannel
    get userContent(): StreamStateView_User
    get userSettingsContent(): StreamStateView_UserSettings
    get userMetadataContent(): StreamStateView_UserMetadata
    get userInboxContent(): StreamStateView_UserInbox
    get mediaContent(): StreamStateView_Media
    snapshot(): Snapshot | undefined
    getMembers(): StreamStateView_Members
    getMemberMetadata(): StreamStateView_MemberMetadata
    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined
    getContent(): StreamStateView_AbstractContent
    userIsEntitledToKeyExchange(userId: string): boolean
    getUsersEntitledToKeyExchange(): Set<string>
}

export class StreamStateView implements IStreamStateView {
    readonly streamId: string
    readonly userId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: StreamTimelineEvent[] = []
    readonly events = new Map<string, StreamTimelineEvent>()
    isInitialized = false
    prevMiniblockHash?: Uint8Array
    lastEventNum = 0n
    syncCookie?: SyncCookie
    saveSnapshots?: boolean // todo: remove
    miniblockSpan?: MiniblockSpan
    terminus?: boolean
    private _snapshot?: Snapshot
    snapshot(): Snapshot | undefined {
        check(this.saveSnapshots === true, 'snapshots are not enabled')
        return this._snapshot
    }
    // membership content
    membershipContent: StreamStateView_Members

    // Space Content
    private readonly _spaceContent?: StreamStateView_Space
    get spaceContent(): StreamStateView_Space {
        check(isDefined(this._spaceContent), `spaceContent not defined for ${this.contentKind}`)
        return this._spaceContent
    }

    // Channel Content
    private readonly _channelContent?: StreamStateView_Channel
    get channelContent(): StreamStateView_Channel {
        check(isDefined(this._channelContent), `channelContent not defined for ${this.contentKind}`)
        return this._channelContent
    }

    // DM Channel Content
    private readonly _dmChannelContent?: StreamStateView_DMChannel
    get dmChannelContent(): StreamStateView_DMChannel {
        check(
            isDefined(this._dmChannelContent),
            `dmChannelContent not defined for ${this.contentKind}`,
        )
        return this._dmChannelContent
    }

    // GDM Channel Content
    private readonly _gdmChannelContent?: StreamStateView_GDMChannel
    get gdmChannelContent(): StreamStateView_GDMChannel {
        check(
            isDefined(this._gdmChannelContent),
            `gdmChannelContent not defined for ${this.contentKind}`,
        )
        return this._gdmChannelContent
    }

    // User Content
    private readonly _userContent?: StreamStateView_User
    get userContent(): StreamStateView_User {
        check(isDefined(this._userContent), `userContent not defined for ${this.contentKind}`)
        return this._userContent
    }

    // User Settings Content
    private readonly _userSettingsContent?: StreamStateView_UserSettings
    get userSettingsContent(): StreamStateView_UserSettings {
        check(
            isDefined(this._userSettingsContent),
            `userSettingsContent not defined for ${this.contentKind}`,
        )
        return this._userSettingsContent
    }

    private readonly _userMetadataContent?: StreamStateView_UserMetadata
    get userMetadataContent(): StreamStateView_UserMetadata {
        check(
            isDefined(this._userMetadataContent),
            `userMetadataContent not defined for ${this.contentKind}`,
        )
        return this._userMetadataContent
    }

    private readonly _userInboxContent?: StreamStateView_UserInbox
    get userInboxContent(): StreamStateView_UserInbox {
        check(
            isDefined(this._userInboxContent),
            `userInboxContent not defined for ${this.contentKind}`,
        )
        return this._userInboxContent
    }

    private readonly _mediaContent?: StreamStateView_Media
    get mediaContent(): StreamStateView_Media {
        check(isDefined(this._mediaContent), `mediaContent not defined for ${this.contentKind}`)
        return this._mediaContent
    }

    constructor(userId: string, streamId: string) {
        log('streamStateView::constructor', streamId)
        this.userId = userId
        this.streamId = streamId

        if (isSpaceStreamId(streamId)) {
            this.contentKind = 'spaceContent'
            this._spaceContent = new StreamStateView_Space(streamId)
        } else if (isChannelStreamId(streamId)) {
            this.contentKind = 'channelContent'
            this._channelContent = new StreamStateView_Channel(streamId)
        } else if (isDMChannelStreamId(streamId)) {
            this.contentKind = 'dmChannelContent'
            this._dmChannelContent = new StreamStateView_DMChannel(streamId)
        } else if (isGDMChannelStreamId(streamId)) {
            this.contentKind = 'gdmChannelContent'
            this._gdmChannelContent = new StreamStateView_GDMChannel(streamId)
        } else if (isMediaStreamId(streamId)) {
            this.contentKind = 'mediaContent'
            this._mediaContent = new StreamStateView_Media(streamId)
        } else if (isUserStreamId(streamId)) {
            this.contentKind = 'userContent'
            this._userContent = new StreamStateView_User(streamId)
        } else if (isUserSettingsStreamId(streamId)) {
            this.contentKind = 'userSettingsContent'
            this._userSettingsContent = new StreamStateView_UserSettings(streamId)
        } else if (isUserDeviceStreamId(streamId)) {
            this.contentKind = 'userMetadataContent'
            this._userMetadataContent = new StreamStateView_UserMetadata(streamId)
        } else if (isUserInboxStreamId(streamId)) {
            this.contentKind = 'userInboxContent'
            this._userInboxContent = new StreamStateView_UserInbox(streamId)
        } else {
            throw new Error(`Stream doesn't have a content kind ${streamId}`)
        }

        this.membershipContent = new StreamStateView_Members(streamId)
    }

    private applySnapshot(
        inSnapshot: Snapshot,
        snapshotSignature: EventSignatureBundle,
        cleartexts: Record<string, Uint8Array | string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        const snapshot = migrateSnapshot(inSnapshot)
        switch (snapshot.content.case) {
            case 'spaceContent':
                this.spaceContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    cleartexts,
                    encryptionEmitter,
                )
                break
            case 'channelContent':
                this.channelContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    cleartexts,
                    encryptionEmitter,
                )
                break
            case 'dmChannelContent':
                this.dmChannelContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    cleartexts,
                    encryptionEmitter,
                )
                break
            case 'gdmChannelContent':
                this.gdmChannelContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    cleartexts,
                    encryptionEmitter,
                )
                break
            case 'mediaContent':
                this.mediaContent.applySnapshot(snapshot, snapshot.content.value, encryptionEmitter)
                break
            case 'userContent':
                this.userContent.applySnapshot(snapshot, snapshot.content.value, encryptionEmitter)
                break
            case 'userMetadataContent':
                this.userMetadataContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    encryptionEmitter,
                )
                break
            case 'userSettingsContent':
                this.userSettingsContent.applySnapshot(snapshot, snapshot.content.value)
                break
            case 'userInboxContent':
                this.userInboxContent.applySnapshot(
                    snapshot,
                    snapshot.content.value,
                    encryptionEmitter,
                )
                break
            case undefined:
                check(false, `Snapshot has no content ${this.streamId}`, Err.STREAM_BAD_EVENT)
                break
            default:
                logNever(snapshot.content)
        }
        this.membershipContent.applySnapshot(
            snapshot,
            snapshotSignature,
            cleartexts,
            encryptionEmitter,
        )
    }

    private appendStreamAndCookie(
        nextSyncCookie: SyncCookie,
        minipoolEvents: ParsedEvent[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): {
        appended: StreamTimelineEvent[]
        updated: StreamTimelineEvent[]
        confirmed: ConfirmedTimelineEvent[]
    } {
        const appended: StreamTimelineEvent[] = []
        const updated: StreamTimelineEvent[] = []
        const confirmed: ConfirmedTimelineEvent[] = []
        for (const parsedEvent of minipoolEvents) {
            const existingEvent = this.events.get(parsedEvent.hashStr)
            if (existingEvent) {
                existingEvent.remoteEvent = parsedEvent
                updated.push(existingEvent)
            } else {
                const event = makeRemoteTimelineEvent({
                    parsedEvent,
                    eventNum: this.lastEventNum++,
                    miniblockNum: undefined,
                    confirmedEventNum: undefined,
                })
                if (event.remoteEvent.event.payload.case !== 'miniblockHeader') {
                    this.timeline.push(event)
                }
                const newlyConfirmed = this.processAppendedEvent(
                    event,
                    cleartexts?.[event.hashStr],
                    encryptionEmitter,
                    stateEmitter,
                )
                appended.push(event)
                if (newlyConfirmed) {
                    confirmed.push(...newlyConfirmed)
                }
            }
        }
        this.syncCookie = nextSyncCookie
        return { appended, updated, confirmed }
    }

    private processAppendedEvent(
        timelineEvent: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): ConfirmedTimelineEvent[] | undefined {
        check(!this.events.has(timelineEvent.hashStr))
        if (timelineEvent.remoteEvent.event.payload.case !== 'miniblockHeader') {
            this.events.set(timelineEvent.hashStr, timelineEvent)
        }

        const event = timelineEvent.remoteEvent
        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)
        let confirmed: ConfirmedTimelineEvent[] | undefined = undefined

        try {
            switch (payload.case) {
                case 'miniblockHeader':
                    if (this.saveSnapshots && payload.value.snapshot) {
                        this._snapshot = payload.value.snapshot
                    }
                    this.prevMiniblockHash = event.hash
                    timelineEvent.confirmedEventNum =
                        payload.value.eventNumOffset + BigInt(payload.value.eventHashes.length)
                    timelineEvent.miniblockNum = payload.value.miniblockNum
                    confirmed = this.processMiniblockHeader(
                        payload.value,
                        payload.value.eventHashes,
                        encryptionEmitter,
                        stateEmitter,
                    )
                    break
                case 'memberPayload':
                    this.membershipContent.appendEvent(
                        timelineEvent,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
                    break
                case undefined:
                    break
                default:
                    this.getContent().appendEvent(
                        timelineEvent,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
            }
        } catch (e) {
            logError(
                `StreamStateView::Error appending streamId: ${this.streamId} event ${event.hashStr}`,
                e,
            )
        }
        return confirmed
    }

    private processMiniblockHeader(
        header: MiniblockHeader,
        eventHashes: Uint8Array[],
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): ConfirmedTimelineEvent[] {
        const confirmed = []
        for (let i = 0; i < eventHashes.length; i++) {
            const eventId = bin_toHexString(eventHashes[i])
            const event = this.events.get(eventId)
            if (!event) {
                logError(`Mininblock event not found ${eventId}`) // aellis this is pretty serious
                continue
            }
            event.miniblockNum = header.miniblockNum
            event.confirmedEventNum = header.eventNumOffset + BigInt(i)
            check(isConfirmedEvent(event), `Event is not confirmed ${eventId}`)
            console.log(
                'syn####processMiniblockHeader: processConfirmedEvent',
                this.streamId,
                eventId,
                event.confirmedEventNum,
                event.miniblockNum,
            )
            this.processConfirmedEvent(event, stateEmitter, encryptionEmitter)
            confirmed.push(event)
        }
        return confirmed
    }

    private processConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        switch (event.remoteEvent.event.payload.case) {
            case 'memberPayload':
                this.membershipContent.onConfirmedEvent(event, stateEmitter, encryptionEmitter)
                break
            case undefined:
                break
            default:
                this.getContent().onConfirmedEvent(event, stateEmitter, encryptionEmitter)
        }
    }

    private processPrependedEvent(
        timelineEvent: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(!this.events.has(timelineEvent.hashStr))
        if (timelineEvent.remoteEvent.event.payload.case !== 'miniblockHeader') {
            this.events.set(timelineEvent.hashStr, timelineEvent)
        }

        const event = timelineEvent.remoteEvent
        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        try {
            switch (payload.case) {
                case 'miniblockHeader':
                    break
                case 'memberPayload':
                    this.membershipContent.prependEvent(
                        timelineEvent,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
                    break
                case undefined:
                    logError(
                        `StreamStateView::Error undefined payload case ${event.hashStr}`,
                        payload,
                    )
                    break
                default:
                    this.getContent().prependEvent(
                        timelineEvent,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
            }
        } catch (e) {
            logError(
                `StreamStateView::Error prepending stream ${this.streamId} event ${event.hashStr}`,
                e,
            )
        }
    }

    // update streeam state with successfully decrypted events by hashStr event id
    updateDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        emitter: TypedEmitter<StreamStateEvents>,
    ) {
        this.membershipContent.onDecryptedContent(eventId, content, emitter)
        this.getContent().onDecryptedContent(eventId, content, emitter)
        const timelineEvent = this.events.get(eventId)
        if (timelineEvent) {
            if (timelineEvent.decryptedContent !== undefined) {
                logError(`timeline event was decrypted twice? ${eventId}`)
            }
            timelineEvent.decryptedContent = content
            check(
                isDecryptedEvent(timelineEvent),
                `Event is not decrypted, programmer error ${eventId}`,
            )
            emitter.emit('streamUpdated', this.streamId, this.contentKind, {
                updated: [timelineEvent],
            })
            // dispatching eventDecrypted makes it easier to test
            emitter.emit('eventDecrypted', this.streamId, this.contentKind, timelineEvent)
        }
    }

    // update stream with decryption status
    updateDecryptedContentError(
        eventId: string,
        content: DecryptionSessionError,
        emitter: TypedEmitter<StreamStateEvents>,
    ) {
        const timelineEvent = this.events.get(eventId)
        if (timelineEvent && !isEqual(timelineEvent.decryptedContentError, content)) {
            check(timelineEvent.decryptedContent === undefined, 'Event is already decrypted')
            timelineEvent.decryptedContentError = content
            emitter.emit('streamUpdated', this.streamId, this.contentKind, {
                updated: [timelineEvent],
            })
        }
    }

    initialize(
        loadedStream: LoadedStream2,
        cleartexts: Record<string, Uint8Array | string> | undefined,
        localEvents: LocalTimelineEvent[],
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        // parse the blocks
        this.miniblockSpan = { ...loadedStream.manifest.miniblockSpan }
        this.terminus = loadedStream.manifest.terminus
        // initialize from snapshot data, this gets all memberships and channel data, etc
        this.applySnapshot(
            loadedStream.snapshot,
            loadedStream.snapshotSignature,
            cleartexts,
            emitter,
        )

        const confirmedEvents = loadedStream.timelineEvents.map((e) => {
            return makeRemoteTimelineEvent({
                parsedEvent: e.event,
                eventNum: e.eventNum,
                miniblockNum: e.miniblockNum,
                confirmedEventNum: e.eventNum,
            })
        })

        // prepend the snapshotted block in reverse order
        this.timeline.push(...confirmedEvents)
        for (let i = confirmedEvents.length - 1; i >= 0; i--) {
            const event = confirmedEvents[i]
            this.processPrependedEvent(event, cleartexts?.[event.hashStr], emitter, undefined)
        }
        // initialize the lastEventNum
        this.lastEventNum = loadedStream.manifest.lastEventNum
        // and the prev miniblock has (if there were more than 1 miniblocks, this should already be set)
        this.prevMiniblockHash = loadedStream.manifest.syncCookie.prevMiniblockHash
        // append the minipool events
        this.appendStreamAndCookie(
            loadedStream.manifest.syncCookie,
            loadedStream.manifest.minipool,
            cleartexts,
            emitter,
            undefined,
        )

        for (const localEvent of localEvents) {
            localEvent.eventNum = this.lastEventNum++
            this.events.set(localEvent.hashStr, localEvent)
            this.timeline.push(localEvent)
            this.getContent().onAppendLocalEvent(localEvent, emitter)
        }

        // let everyone know
        this.isInitialized = true
        emitter?.emit('streamInitialized', this.streamId, this.contentKind)
    }

    appendEvents(
        events: ParsedEvent[],
        nextSyncCookie: SyncCookie,
        cleartexts: Record<string, Uint8Array | string> | undefined,
        emitter: TypedEmitter<StreamEvents>,
    ) {
        check(
            isDefined(this.miniblockSpan),
            'StreamStateView::appendEvents: miniblockSpan is not set',
        )
        if (nextSyncCookie.minipoolGen < this.miniblockSpan.toExclusive) {
            logError(
                'StreamStateView::appendEvents: miniblockSpan is before the current miniblockSpan, ignoring',
                {
                    minipoolGen: nextSyncCookie.minipoolGen,
                    currentMiniblockSpan: this.miniblockSpan,
                },
            )
            return
        }
        this.miniblockSpan.toExclusive = nextSyncCookie.minipoolGen
        const { appended, updated, confirmed } = this.appendStreamAndCookie(
            nextSyncCookie,
            events,
            cleartexts,
            emitter,
            emitter,
        )
        emitter?.emit('streamUpdated', this.streamId, this.contentKind, {
            appended: appended.length > 0 ? appended : undefined,
            updated: updated.length > 0 ? updated : undefined,
            confirmed: confirmed.length > 0 ? confirmed : undefined,
        })
    }

    prependConfirmedEvents(
        miniblockSpan: MiniblockSpan,
        events: ConfirmedEvent[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
        terminus: boolean,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const prependedFull = events.map((e) =>
            makeRemoteTimelineEvent({
                parsedEvent: e.event,
                eventNum: e.eventNum,
                miniblockNum: e.miniblockNum,
            }),
        )
        this._prependEvents(
            miniblockSpan,
            prependedFull,
            cleartexts,
            terminus,
            encryptionEmitter,
            stateEmitter,
        )
    }

    prependEvents(
        miniblockSpan: MiniblockSpan,
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
        terminus: boolean,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const prependedFull = miniblocks.flatMap((mb) =>
            mb.events.map((parsedEvent, i) =>
                makeRemoteTimelineEvent({
                    parsedEvent,
                    eventNum: mb.header.eventNumOffset + BigInt(i),
                    miniblockNum: mb.header.miniblockNum,
                    confirmedEventNum: mb.header.eventNumOffset + BigInt(i),
                }),
            ),
        )
        this._prependEvents(
            miniblockSpan,
            prependedFull,
            cleartexts,
            terminus,
            encryptionEmitter,
            stateEmitter,
        )
    }

    private _prependEvents(
        miniblockSpan: MiniblockSpan,
        prependedFull: RemoteTimelineEvent[],
        cleartexts: Record<string, Uint8Array | string> | undefined,
        terminus: boolean,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        check(
            isDefined(this.miniblockSpan),
            'StreamStateView::prependConfirmedEvents: miniblockSpan is not set',
        )
        if (miniblockSpan.fromInclusive >= this.miniblockSpan.fromInclusive) {
            logError(
                'StreamStateView::prependConfirmedEvents: miniblockSpan is after the current miniblockSpan',
                {
                    miniblockSpan,
                    currentMiniblockSpan: this.miniblockSpan,
                },
            )
            return
        }
        if (miniblockSpan.toExclusive > this.miniblockSpan.fromInclusive) {
            logWarning(
                'StreamStateView::prependConfirmedEvents: miniblockSpan overlapps the current miniblockSpan',
                {
                    miniblockSpan,
                    currentMiniblockSpan: this.miniblockSpan,
                },
            )
        }
        this.miniblockSpan.fromInclusive = miniblockSpan.fromInclusive
        this.terminus = terminus
        // aellis 11/23 I don't know why we're getting dupes on scrollback,
        // but this prevents us from throwing an error
        const prepended = prependedFull.filter((e) => !this.events.has(e.hashStr))
        if (prepended.length !== prependedFull.length) {
            logError('StreamStateView::prependEvents: duplicate events found', {
                dupes: prependedFull
                    .filter((e) => this.events.has(e.hashStr))
                    .map((e) => e.hashStr),
            })
        }

        this.timeline.unshift(
            ...prepended.filter((e) => e.remoteEvent.event.payload.case !== 'miniblockHeader'),
        )
        // prepend the new block events in reverse order
        for (let i = prepended.length - 1; i >= 0; i--) {
            const event = prepended[i]
            this.processPrependedEvent(
                event,
                cleartexts?.[event.hashStr],
                encryptionEmitter,
                stateEmitter,
            )
        }

        stateEmitter?.emit('streamUpdated', this.streamId, this.contentKind, { prepended })
    }

    appendLocalEvent(
        channelMessage: ChannelMessage,
        status: LocalEventStatus,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ) {
        const localId = genLocalId()
        log('appendLocalEvent', localId)
        const timelineEvent = {
            hashStr: localId,
            creatorUserId: this.userId,
            eventNum: this.lastEventNum++,
            localEvent: { localId, channelMessage, status },
            createdAtEpochMs: BigInt(Date.now()),
        } satisfies StreamTimelineEvent
        this.events.set(localId, timelineEvent)
        this.timeline.push(timelineEvent)
        this.getContent().onAppendLocalEvent(timelineEvent, emitter)

        emitter?.emit('streamUpdated', this.streamId, this.contentKind, {
            appended: [timelineEvent],
        })
        return localId
    }

    updateLocalEvent(
        localId: string,
        parsedEventHash: string,
        status: LocalEventStatus,
        emitter: TypedEmitter<StreamEvents>,
    ) {
        log('updateLocalEvent', { localId, parsedEventHash, status })
        const timelineEvent = this.events.get(localId)
        check(isDefined(timelineEvent), `Local event not found ${localId}`)
        check(isLocalEvent(timelineEvent), `Event is not local ${localId}`)
        const previousId = timelineEvent.hashStr
        timelineEvent.hashStr = parsedEventHash
        timelineEvent.localEvent.status = status
        this.events.set(parsedEventHash, timelineEvent)

        emitter?.emit(
            'streamLocalEventUpdated',
            this.streamId,
            this.contentKind,
            previousId,
            timelineEvent,
        )
    }

    getMembers(): StreamStateView_Members {
        return this.membershipContent
    }

    getMemberMetadata(): StreamStateView_MemberMetadata {
        return this.membershipContent.memberMetadata
    }

    getChannelMetadata(): StreamStateView_ChannelMetadata | undefined {
        return this.getContent().getChannelMetadata()
    }

    getContent(): StreamStateView_AbstractContent {
        switch (this.contentKind) {
            case 'channelContent':
                return this.channelContent
            case 'dmChannelContent':
                return this.dmChannelContent
            case 'gdmChannelContent':
                return this.gdmChannelContent
            case 'spaceContent':
                return this.spaceContent
            case 'userContent':
                return this.userContent
            case 'userSettingsContent':
                return this.userSettingsContent
            case 'userMetadataContent':
                return this.userMetadataContent
            case 'userInboxContent':
                return this.userInboxContent
            case 'mediaContent':
                return this.mediaContent
            case undefined:
                throw new Error('Stream has no content')
            default:
                logNever(this.contentKind)
                return new StreamStateView_UnknownContent(this.streamId)
        }
    }

    /**
     * Streams behave slightly differently.
     * Regular channels: the user needs to be an active member. SO_JOIN
     * DMs: always open for key exchange for any of the two participants
     */
    userIsEntitledToKeyExchange(userId: string): boolean {
        return this.getUsersEntitledToKeyExchange().has(userId)
    }

    getUsersEntitledToKeyExchange(): Set<string> {
        switch (this.contentKind) {
            case 'channelContent':
            case 'spaceContent':
            case 'gdmChannelContent':
                return this.getMembers().joinedParticipants()
            case 'dmChannelContent':
                return this.getMembers().participants() // send keys to all participants
            default:
                return new Set()
        }
    }
}
