import { dlog, dlogError } from './dlog'
import {
    ChannelMessage,
    Err,
    SnapshotCaseType,
    SyncCookie,
    Snapshot,
    MiniblockHeader,
    MembershipOp,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { check, logNever, isDefined } from './check'
import {
    ConfirmedTimelineEvent,
    ParsedMiniblock,
    ParsedStreamAndCookie,
    RemoteTimelineEvent,
    StreamTimelineEvent,
    isConfirmedEvent,
    isDecryptedEvent,
    isLocalEvent,
    makeRemoteTimelineEvent,
} from './types'
import { EmittedEvents } from './client'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { StreamStateView_Media } from './streamStateView_Media'
import { StreamStateView_GDMChannel } from './streamStateView_GDMChannel'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { StreamStateView_DMChannel } from './streamStateView_DMChannel'
import { genLocalId } from './id'
import { StreamStateView_UserToDevice } from './streamStateView_UserToDevice'
import { bin_toHexString } from './binary'
import { StreamStateView_CommonContent } from './streamStateView_CommonContent'
import { DecryptedContent, DecryptedContentError } from './encryptedContentTypes'
import { StreamStateView_UnknownContent } from './streamStateView_UnknownContent'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import isEqual from 'lodash/isEqual'

const log = dlog('csb:streams')
const logError = dlogError('csb:streams:error')

export class StreamStateView {
    readonly streamId: string
    readonly userId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: StreamTimelineEvent[] = []
    readonly events = new Map<string, StreamTimelineEvent>()

    prevMiniblockHash?: Uint8Array
    lastEventNum = 0n
    prevSnapshotMiniblockNum: bigint
    miniblockInfo?: { max: bigint; min: bigint; terminusReached: boolean }
    syncCookie?: SyncCookie

    // Common Content
    commonContent: StreamStateView_CommonContent

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

    private readonly _userToDeviceContent?: StreamStateView_UserToDevice
    get userToDeviceContent(): StreamStateView_UserToDevice {
        check(
            isDefined(this._userToDeviceContent),
            `userToDeviceContent not defined for ${this.contentKind}`,
        )
        return this._userToDeviceContent
    }

    private readonly _mediaContent?: StreamStateView_Media
    get mediaContent(): StreamStateView_Media {
        check(isDefined(this._mediaContent), `mediaContent not defined for ${this.contentKind}`)
        return this._mediaContent
    }

    constructor(
        userId: string,
        streamId: string,
        snapshot: Snapshot,
        prevSnapshotMiniblockNum: bigint,
    ) {
        log('streamStateView', streamId)
        check(isDefined(snapshot), `Stream is empty ${streamId}`, Err.STREAM_EMPTY)

        check(
            isDefined(snapshot.content.value?.inception),
            `Snapshot does not contain inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        const inceptionPayload = snapshot.content.value?.inception
        check(
            inceptionPayload?.streamId === streamId,
            `Non-matching stream id in inception ${streamId} != ${inceptionPayload?.streamId}`,
            Err.STREAM_BAD_EVENT,
        )

        this.userId = userId
        this.streamId = streamId
        this.contentKind = snapshot.content.case
        this.prevSnapshotMiniblockNum = prevSnapshotMiniblockNum
        this.commonContent = new StreamStateView_CommonContent(streamId)

        switch (snapshot.content.case) {
            case 'channelContent':
                this._channelContent = new StreamStateView_Channel(
                    userId,
                    snapshot.content.value.inception,
                )
                break
            case 'dmChannelContent':
                this._dmChannelContent = new StreamStateView_DMChannel(
                    userId,
                    snapshot.content.value.inception,
                )
                break
            case 'gdmChannelContent':
                this._gdmChannelContent = new StreamStateView_GDMChannel(
                    userId,
                    snapshot.content.value.inception,
                )
                break
            case 'spaceContent':
                this._spaceContent = new StreamStateView_Space(
                    userId,
                    snapshot.content.value.inception,
                )
                break
            case 'userContent':
                this._userContent = new StreamStateView_User(snapshot.content.value.inception)
                break
            case 'userSettingsContent':
                this._userSettingsContent = new StreamStateView_UserSettings(
                    snapshot.content.value.inception,
                )
                break
            case 'userDeviceKeyContent':
                this._userDeviceKeyContent = new StreamStateView_UserDeviceKeys(
                    snapshot.content.value.inception,
                )
                break
            case `userToDeviceContent`:
                this._userToDeviceContent = new StreamStateView_UserToDevice(
                    snapshot.content.value.inception,
                )
                break
            case 'mediaContent':
                this._mediaContent = new StreamStateView_Media(snapshot.content.value.inception)
                break
            case undefined:
                check(false, `Snapshot has no content ${streamId}`, Err.STREAM_BAD_EVENT)
                break
            default:
                logNever(snapshot.content)
        }
    }

    private initializeFromSnapshot(
        snapshot: Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // first initialize content specific data
        switch (snapshot.content.case) {
            case 'channelContent':
                this.channelContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'dmChannelContent':
                this.dmChannelContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'gdmChannelContent':
                this.gdmChannelContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'spaceContent':
                this.spaceContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'userContent':
                this.userContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'userSettingsContent':
                this.userSettingsContent.initialize(snapshot, snapshot.content.value)
                break
            case 'userDeviceKeyContent':
                this.userDeviceKeyContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'userToDeviceContent':
                this.userToDeviceContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case 'mediaContent':
                this.mediaContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case undefined:
                check(false, `Snapshot has no content ${this.streamId}`, Err.STREAM_BAD_EVENT)
                break
            default:
                logNever(snapshot.content)
        }

        // then initialize common content
        this.commonContent.initialize(snapshot, emitter)
    }

    private appendStreamAndCookie(
        streamAndCookie: ParsedStreamAndCookie,
        cleartexts: Record<string, string> | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): {
        appended: StreamTimelineEvent[]
        updated: StreamTimelineEvent[]
        confirmed: ConfirmedTimelineEvent[]
    } {
        const appended: StreamTimelineEvent[] = []
        const updated: StreamTimelineEvent[] = []
        const confirmed: ConfirmedTimelineEvent[] = []
        for (const parsedEvent of streamAndCookie.events) {
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
                    emitter,
                )
                appended.push(event)
                if (newlyConfirmed) {
                    confirmed.push(...newlyConfirmed)
                }
            }
        }
        this.syncCookie = streamAndCookie.nextSyncCookie
        return { appended, updated, confirmed }
    }

    private processAppendedEvent(
        timelineEvent: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
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
                    this.prevMiniblockHash = event.envelope.hash
                    this.updateMiniblockInfo(payload.value, { max: payload.value.miniblockNum })
                    timelineEvent.confirmedEventNum =
                        payload.value.eventNumOffset + BigInt(payload.value.eventHashes.length)
                    confirmed = []
                    for (let i = 0; i < payload.value.eventHashes.length; i++) {
                        const eventId = bin_toHexString(payload.value.eventHashes[i])
                        const event = this.events.get(eventId)
                        if (!event) {
                            logError(`Mininblock event not found ${eventId}`) // aellis this is pretty serious
                            continue
                        }
                        event.miniblockNum = payload.value.miniblockNum
                        event.confirmedEventNum = payload.value.eventNumOffset + BigInt(i)
                        check(isConfirmedEvent(event), `Event is not confirmed ${eventId}`)
                        this.getContent().onConfirmedEvent(event, emitter)
                        this.commonContent.onConfirmedEvent(event, emitter)
                        confirmed.push(event)
                    }
                    break
                case 'commonPayload':
                    this.commonContent.appendCommonContent(event, payload.value, emitter)
                    break
                case undefined:
                    break
                default:
                    this.getContent().appendEvent(timelineEvent, cleartext, emitter)
            }
        } catch (e) {
            logError(`StreamStateView::Error appending event ${event.hashStr}`, e)
        }
        return confirmed
    }

    private processPrependedEvent(
        timelineEvent: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
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
                case 'commonPayload':
                    this.commonContent.prependCommonContent(event, payload.value, emitter)
                    break
                case undefined:
                    logError(
                        `StreamStateView::Error undefined payload case ${event.hashStr}`,
                        payload,
                    )
                    break
                default:
                    this.getContent().prependEvent(timelineEvent, cleartext, emitter)
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
        emitter: TypedEmitter<EmittedEvents>,
    ) {
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
        content: DecryptedContentError,
        emitter: TypedEmitter<EmittedEvents>,
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
        streamAndCookie: ParsedStreamAndCookie,
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        cleartexts: Record<string, string> | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(miniblocks.length > 0, `Stream has no miniblocks ${this.streamId}`, Err.STREAM_EMPTY)
        // parse the blocks
        // initialize from snapshot data, this gets all memberships and channel data, etc
        this.initializeFromSnapshot(snapshot, emitter)
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
            this.processPrependedEvent(event, cleartexts?.[event.hashStr], emitter)
        }
        // append the new block events
        this.timeline.push(...rest)
        for (const event of rest) {
            this.processAppendedEvent(event, cleartexts?.[event.hashStr], emitter)
        }
        // initialize the lastEventNum
        const lastBlock = miniblocks[miniblocks.length - 1]
        this.lastEventNum = lastBlock.header.eventNumOffset + BigInt(lastBlock.events.length)
        // and the prev miniblock has (if there were more than 1 miniblocks, this should already be set)
        this.prevMiniblockHash = lastBlock.hash
        // append the minipool events
        this.appendStreamAndCookie(streamAndCookie, cleartexts, emitter)
        // let everyone know
        emitter?.emit('streamInitialized', this.streamId, this.contentKind)
    }

    appendEvents(
        streamAndCookie: ParsedStreamAndCookie,
        cleartexts: Record<string, string> | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const { appended, updated, confirmed } = this.appendStreamAndCookie(
            streamAndCookie,
            cleartexts,
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
        emitter: TypedEmitter<EmittedEvents> | undefined,
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
            this.processPrependedEvent(event, cleartexts?.[event.hashStr], emitter)
        }

        if (this.miniblockInfo && terminus) {
            this.miniblockInfo.terminusReached = true
        }

        emitter?.emit('streamUpdated', this.streamId, this.contentKind, { prepended })
    }

    appendLocalEvent(
        channelMessage: ChannelMessage,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const localId = genLocalId()
        const timelineEvent = {
            hashStr: localId,
            creatorUserId: this.userId,
            eventNum: this.lastEventNum++,
            localEvent: { localId, channelMessage },
            createdAtEpocMs: BigInt(Date.now()),
        } satisfies StreamTimelineEvent
        this.events.set(localId, timelineEvent)
        this.timeline.push(timelineEvent)
        emitter?.emit('streamUpdated', this.streamId, this.contentKind, {
            appended: [timelineEvent],
        })
        return localId
    }

    updateLocalEvent(
        localId: string,
        parsedEventHash: string,
        emitter: TypedEmitter<EmittedEvents>,
    ) {
        const timelineEvent = this.events.get(localId)
        check(isDefined(timelineEvent), `Local event not found ${localId}`)
        check(isLocalEvent(timelineEvent), `Event is not local ${localId}`)
        timelineEvent.hashStr = parsedEventHash
        this.events.set(parsedEventHash, timelineEvent)
        emitter?.emit(
            'streamLocalEventIdReplaced',
            this.streamId,
            this.contentKind,
            localId,
            timelineEvent,
        )
    }

    getMemberships(): StreamStateView_Membership {
        const memberships = this.getContent().memberships
        check(isDefined(memberships), `Memberships object not defined in content ${this.streamId}`)
        return memberships
    }

    getUserMetadata(): StreamStateView_UserMetadata | undefined {
        return this.getContent().getUserMetadata()
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
            case 'userToDeviceContent':
                return this.userToDeviceContent
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
     * GDMs: open for key exchange while the membership state is either SO_JOIN or SO_INVITE
     */
    userIsEntitledToKeyExchange(userId: string): boolean {
        switch (this.contentKind) {
            case 'channelContent':
            case 'spaceContent':
                return this.getMemberships().isMember(MembershipOp.SO_JOIN, userId)
            case 'dmChannelContent':
                return this.dmChannelContent.participants().has(userId)
            case 'gdmChannelContent':
                return this.gdmChannelContent.joinedOrInvitedParticipants().has(userId)
            default:
                throw new Error('Stream does not support key exchange') // meow
        }
    }

    getUsersEntitledToKeyExchange(): Set<string> {
        switch (this.contentKind) {
            case 'channelContent':
                return new Set([
                    ...this.getMemberships().joinedUsers,
                    ...this.getMemberships().invitedUsers,
                ])
            case 'dmChannelContent':
                return this.dmChannelContent.participants()
            case 'gdmChannelContent':
                return this.gdmChannelContent.joinedOrInvitedParticipants()
            default:
                return new Set()
        }
    }
}
