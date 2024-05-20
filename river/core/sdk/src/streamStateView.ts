import { dlog, dlogError, bin_toHexString, check } from '@river-build/dlog'
import { isDefined, logNever } from './check'
import {
    ChannelMessage,
    Err,
    SnapshotCaseType,
    SyncCookie,
    Snapshot,
    MiniblockHeader,
} from '@river-build/proto'
import TypedEmitter from 'typed-emitter'
import {
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
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
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
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { StreamStateView_ChannelMetadata } from './streamStateView_ChannelMetadata'
import { StreamEvents, StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import isEqual from 'lodash/isEqual'
import { DecryptionSessionError } from '@river-build/encryption'
import { migrateSnapshot } from './migrations/migrateSnapshot'

const log = dlog('csb:streams')
const logError = dlogError('csb:streams:error')

export class StreamStateView {
    readonly streamId: string
    readonly userId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: StreamTimelineEvent[] = []
    readonly events = new Map<string, StreamTimelineEvent>()
    isInitialized = false
    snapshot?: Snapshot
    prevMiniblockHash?: Uint8Array
    lastEventNum = 0n
    prevSnapshotMiniblockNum: bigint
    miniblockInfo?: { max: bigint; min: bigint; terminusReached: boolean }
    syncCookie?: SyncCookie

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
            `dmChannelContent not defined for ${this.contentKind}`,
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

    private readonly _userDeviceKeyContent?: StreamStateView_UserDeviceKeys
    get userDeviceKeyContent(): StreamStateView_UserDeviceKeys {
        check(
            isDefined(this._userDeviceKeyContent),
            `userDeviceKeyContent not defined for ${this.contentKind}`,
        )
        return this._userDeviceKeyContent
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
            this.contentKind = 'userDeviceKeyContent'
            this._userDeviceKeyContent = new StreamStateView_UserDeviceKeys(streamId)
        } else if (isUserInboxStreamId(streamId)) {
            this.contentKind = 'userInboxContent'
            this._userInboxContent = new StreamStateView_UserInbox(streamId)
        } else {
            throw new Error(`Stream doesn't have a content kind ${streamId}`)
        }

        this.prevSnapshotMiniblockNum = 0n
        this.membershipContent = new StreamStateView_Members(streamId)
    }

    private applySnapshot(
        eventHash: string,
        inSnapshot: Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        const snapshot = migrateSnapshot(inSnapshot)
        this.snapshot = snapshot
        switch (snapshot.content.case) {
            case 'spaceContent':
                this.spaceContent.applySnapshot(
                    eventHash,
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
            case 'userDeviceKeyContent':
                this.userDeviceKeyContent.applySnapshot(
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
        this.membershipContent.applySnapshot(snapshot, cleartexts, encryptionEmitter)
    }

    private appendStreamAndCookie(
        nextSyncCookie: SyncCookie,
        minipoolEvents: ParsedEvent[],
        cleartexts: Record<string, string> | undefined,
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
                this.timeline.push(event)
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
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): ConfirmedTimelineEvent[] | undefined {
        check(!this.events.has(timelineEvent.hashStr))
        this.events.set(timelineEvent.hashStr, timelineEvent)

        const event = timelineEvent.remoteEvent
        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)
        let confirmed: ConfirmedTimelineEvent[] | undefined = undefined

        try {
            switch (payload.case) {
                case 'miniblockHeader':
                    check(
                        (this.miniblockInfo?.max ?? -1n) < payload.value.miniblockNum,
                        `Miniblock number out of order ${payload.value.miniblockNum} > ${this.miniblockInfo?.max}`,
                        Err.STREAM_BAD_EVENT,
                    )
                    if (payload.value.snapshot) {
                        this.snapshot = migrateSnapshot(payload.value.snapshot)
                    }
                    this.prevMiniblockHash = event.hash
                    this.updateMiniblockInfo(payload.value, { max: payload.value.miniblockNum })
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
                        payload.value,
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
            switch (event.remoteEvent.event.payload.case) {
                case 'memberPayload':
                    this.membershipContent.onConfirmedEvent(
                        event,
                        event.remoteEvent.event.payload.value,
                        encryptionEmitter,
                        stateEmitter,
                    )
                    break
                case undefined:
                    break
                default:
                    this.getContent().onConfirmedEvent(event, stateEmitter)
            }
            confirmed.push(event)
        }
        return confirmed
    }

    private processPrependedEvent(
        timelineEvent: RemoteTimelineEvent,
        cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(!this.events.has(timelineEvent.hashStr))
        this.events.set(timelineEvent.hashStr, timelineEvent)

        const event = timelineEvent.remoteEvent
        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        try {
            switch (payload.case) {
                case 'miniblockHeader':
                    this.updateMiniblockInfo(payload.value, { min: payload.value.miniblockNum })
                    this.prevSnapshotMiniblockNum = payload.value.prevSnapshotMiniblockNum
                    break
                case 'memberPayload':
                    this.membershipContent.prependEvent(
                        timelineEvent,
                        payload.value,
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
            logError(`StreamStateView::Error prepending event ${event.hashStr}`, e)
        }
    }

    private updateMiniblockInfo(value: MiniblockHeader, update: { max?: bigint; min?: bigint }) {
        if (!this.miniblockInfo) {
            this.miniblockInfo = {
                max: value.miniblockNum,
                min: value.miniblockNum,
                terminusReached: value.miniblockNum === 0n,
            }
            return
        }

        if (update.max && update.max > this.miniblockInfo.max) {
            this.miniblockInfo.max = update.max
        }

        if (update.min && update.min < this.miniblockInfo.min) {
            this.miniblockInfo.min = update.min
        }

        if (this.miniblockInfo.min === 0n || this.miniblockInfo.max === 0n) {
            this.miniblockInfo.terminusReached = true
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
        nextSyncCookie: SyncCookie,
        minipoolEvents: ParsedEvent[],
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        prependedMiniblocks: ParsedMiniblock[],
        prevSnapshotMiniblockNum: bigint,
        cleartexts: Record<string, string> | undefined,
        localEvents: LocalTimelineEvent[],
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        check(miniblocks.length > 0, `Stream has no miniblocks ${this.streamId}`, Err.STREAM_EMPTY)
        // parse the blocks
        // initialize from snapshot data, this gets all memberships and channel data, etc
        this.applySnapshot(bin_toHexString(miniblocks[0].hash), snapshot, cleartexts, emitter)
        // initialize from miniblocks, the first minblock is the snapshot block, it's events are accounted for
        const block0Events = miniblocks[0].events.map((parsedEvent, i) => {
            const eventNum = miniblocks[0].header.eventNumOffset + BigInt(i)
            return makeRemoteTimelineEvent({
                parsedEvent,
                eventNum,
                miniblockNum: miniblocks[0].header.miniblockNum,
                confirmedEventNum: eventNum,
            })
        })
        // the rest need to be added to the timeline
        const rest = miniblocks.slice(1).flatMap((mb) =>
            mb.events.map((parsedEvent, i) => {
                const eventNum = mb.header.eventNumOffset + BigInt(i)
                return makeRemoteTimelineEvent({
                    parsedEvent,
                    eventNum,
                    miniblockNum: mb.header.miniblockNum,
                    confirmedEventNum: eventNum,
                })
            }),
        )
        // initialize our event hashes
        check(block0Events.length > 0)
        // prepend the snapshotted block in reverse order
        this.timeline.push(...block0Events)
        for (let i = block0Events.length - 1; i >= 0; i--) {
            const event = block0Events[i]
            this.processPrependedEvent(event, cleartexts?.[event.hashStr], emitter, undefined)
        }
        // append the new block events
        this.timeline.push(...rest)
        for (const event of rest) {
            this.processAppendedEvent(event, cleartexts?.[event.hashStr], emitter, undefined)
        }
        // initialize the lastEventNum
        const lastBlock = miniblocks[miniblocks.length - 1]
        this.lastEventNum = lastBlock.header.eventNumOffset + BigInt(lastBlock.events.length)
        // and the prev miniblock has (if there were more than 1 miniblocks, this should already be set)
        this.prevMiniblockHash = lastBlock.hash
        // append the minipool events
        this.appendStreamAndCookie(nextSyncCookie, minipoolEvents, cleartexts, emitter, undefined)
        this.prevSnapshotMiniblockNum = prevSnapshotMiniblockNum

        if (prependedMiniblocks.length > 0) {
            this.prependEvents(
                prependedMiniblocks,
                cleartexts,
                prependedMiniblocks[0].header.miniblockNum === 0n,
                emitter,
                undefined,
            )
        }

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
        cleartexts: Record<string, string> | undefined,
        emitter: TypedEmitter<StreamEvents>,
    ) {
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

    prependEvents(
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, string> | undefined,
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

        this.timeline.unshift(...prepended)
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

        if (this.miniblockInfo && terminus) {
            this.miniblockInfo.terminusReached = true
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

    getUserMetadata(): StreamStateView_UserMetadata {
        return this.membershipContent.userMetadata
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
            case 'userDeviceKeyContent':
                return this.userDeviceKeyContent
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
