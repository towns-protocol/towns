import { dlog, dlogError } from './dlog'
import {
    ChannelMessage,
    Err,
    SnapshotCaseType,
    SyncCookie,
    StreamAndCookie,
    Snapshot,
    Miniblock,
    MiniblockHeader,
    MembershipOp,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { check, logNever, isDefined } from './check'
import {
    ParsedMiniblock,
    RemoteTimelineEvent,
    StreamTimelineEvent,
    isLocalEvent,
    makeRemoteTimelineEvent,
} from './types'
import { RiverEventV2 } from './eventV2'
import { unpackEnvelope, unpackMiniblock } from './sign'
import { EmittedEvents } from './client'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { StreamStateView_Media } from './streamStateView_Media'
import { StreamStateView_GDMChannel } from './streamStateView_GDMChannel'
import {
    StreamStateView_IContent,
    StreamStateView_UnknownContent,
} from './streamStateView_IContent'
import { StreamStateView_DMChannel } from './streamStateView_DMChannel'
import { genLocalId } from './id'

const log = dlog('csb:streams')
const logError = dlogError('csb:streams:error')

export class StreamStateView {
    readonly streamId: string
    readonly userId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: StreamTimelineEvent[] = []
    readonly events = new Map<string, StreamTimelineEvent>()
    readonly leafEventHashes = new Map<string, Uint8Array>()

    lastEventNum = 0n
    prevSnapshotMiniblockNum: bigint
    miniblockInfo?: { max: bigint; min: bigint; terminusReached: boolean }
    syncCookie?: SyncCookie

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
            case 'mediaContent':
                this.mediaContent.initialize(snapshot, snapshot.content.value, emitter)
                break
            case undefined:
                check(false, `Snapshot has no content ${this.streamId}`, Err.STREAM_BAD_EVENT)
                break
            default:
                logNever(snapshot.content)
        }
    }

    private appendStreamAndCookie(
        streamAndCookie: StreamAndCookie,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): { appended: StreamTimelineEvent[]; updated: StreamTimelineEvent[] } {
        const appended: StreamTimelineEvent[] = []
        const updated: StreamTimelineEvent[] = []
        for (const unparsedEvent of streamAndCookie.events) {
            const parsedEvent = unpackEnvelope(unparsedEvent)
            const existingEvent = this.events.get(parsedEvent.hashStr)
            if (existingEvent) {
                existingEvent.remoteEvent = parsedEvent
                updated.push(existingEvent)
            } else {
                const event = makeRemoteTimelineEvent(parsedEvent, this.lastEventNum++)
                this.timeline.push(event)
                this.processAppendedEvent(event, emitter)
                appended.push(event)
            }
        }
        this.syncCookie = streamAndCookie.nextSyncCookie
        return { appended, updated }
    }

    private processAppendedEvent(
        timelineEvent: RemoteTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(!this.events.has(timelineEvent.hashStr))
        this.events.set(timelineEvent.hashStr, timelineEvent)

        const event = timelineEvent.remoteEvent
        for (const prev of event.prevEventsStrs ?? []) {
            if (!this.events.has(prev)) {
                log(
                    `Added event with unknown prevEvent ${prev}, hash=${event.hashStr}, stream=${this.streamId}`,
                )
            }
        }

        this.leafEventHashes.set(event.hashStr, event.envelope.hash)
        for (const prev of event.prevEventsStrs ?? []) {
            this.leafEventHashes.delete(prev)
        }

        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        try {
            switch (payload.case) {
                case 'channelPayload':
                    this.channelContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'dmChannelPayload':
                    this.dmChannelContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'gdmChannelPayload':
                    this.gdmChannelContent.appendEvent(event, payload.value, emitter)
                    break
                case 'spacePayload':
                    this.spaceContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'userPayload':
                    this.userContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'userSettingsPayload':
                    this.userSettingsContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'userDeviceKeyPayload':
                    this.userDeviceKeyContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'mediaPayload':
                    this.mediaContent?.appendEvent(event, payload.value, emitter)
                    break
                case 'miniblockHeader':
                    this.getContent().onMiniblockHeader(payload.value, emitter)
                    this.updateMiniblockInfo(payload.value, { max: payload.value.miniblockNum })
                    break

                case undefined:
                    break
                default:
                    logNever(payload)
            }
        } catch (e) {
            logError(`StreamStateView::Error appending event ${event.hashStr}`, e)
        }
    }

    private processPrependedEvent(
        timelineEvent: RemoteTimelineEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(!this.events.has(timelineEvent.hashStr))
        this.events.set(timelineEvent.hashStr, timelineEvent)

        const event = timelineEvent.remoteEvent
        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        try {
            switch (payload.case) {
                case 'channelPayload':
                    this.channelContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'dmChannelPayload':
                    this.dmChannelContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'gdmChannelPayload':
                    this.gdmChannelContent.prependEvent(event, payload.value, emitter)
                    break
                case 'spacePayload':
                    this.spaceContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'userPayload':
                    this.userContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'userSettingsPayload':
                    this.userSettingsContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'userDeviceKeyPayload':
                    this.userDeviceKeyContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'mediaPayload':
                    this.mediaContent?.prependEvent(event, payload.value, emitter)
                    break
                case 'miniblockHeader':
                    this.updateMiniblockInfo(payload.value, { min: payload.value.miniblockNum })
                    this.prevSnapshotMiniblockNum = payload.value.prevSnapshotMiniblockNum
                    break

                case undefined:
                    break
                default:
                    logNever(payload)
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
    updateDecrypted(event: RiverEventV2, emitter: TypedEmitter<EmittedEvents>): void {
        const hashStr = event.getId()
        if (!hashStr) {
            log(`Ignoring decrypted event with no hash id`)
            return
        }
        if (event.shouldAttemptDecryption()) {
            log(`Ignoring event that has not attempted decryption yet, hash=${hashStr}`)
            return
        }

        const timelineEvent = this.events.get(hashStr)
        if (!timelineEvent) {
            logError(`Ignoring decrypted event that is not in timeline, hash=${hashStr}`)
            return
        }

        if (timelineEvent.decryptedContent === event) {
            log(`Ignoring duplicate decrypted event ${hashStr}`)
            return
        }

        if (timelineEvent.decryptedContent !== undefined) {
            logError(`timeline event was decrypted twice? ${hashStr}`)
        }

        timelineEvent.decryptedContent = event

        emitter.emit('streamUpdated', this.streamId, this.contentKind, {
            updated: [timelineEvent],
        })
    }

    initialize(
        streamAndCookie: StreamAndCookie,
        snapshot: Snapshot,
        miniblocks: ParsedMiniblock[],
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(miniblocks.length > 0, `Stream has no miniblocks ${this.streamId}`, Err.STREAM_EMPTY)
        // parse the blocks
        // initialize from snapshot data, this gets all memberships and channel data, etc
        this.initializeFromSnapshot(snapshot, emitter)
        // initialize from miniblocks, the first minblock is the snapshot block, it's events are accounted for
        const block0 = miniblocks[0].events.map((e, i) =>
            makeRemoteTimelineEvent(e, miniblocks[0].header.eventNumOffset + BigInt(i)),
        )
        // the rest need to be added to the timeline
        const rest = miniblocks
            .slice(1)
            .flatMap((mb) =>
                mb.events.map((e, i) =>
                    makeRemoteTimelineEvent(e, mb.header.eventNumOffset + BigInt(i)),
                ),
            )
        // initialize our event hashes
        check(block0.length > 0)
        // save the hash so that we can submit new events to this stream
        this.leafEventHashes.set(
            block0[block0.length - 1].remoteEvent.hashStr,
            block0[block0.length - 1].remoteEvent.envelope.hash,
        )
        // prepend the snapshotted block in reverse order
        this.timeline.push(...block0)
        for (let i = block0.length - 1; i >= 0; i--) {
            const event = block0[i]
            this.processPrependedEvent(event, emitter)
        }
        // append the new block events
        this.timeline.push(...rest)
        for (const event of rest) {
            this.processAppendedEvent(event, emitter)
        }
        // initialize the lastEventNum
        const lastBlock = miniblocks[miniblocks.length - 1]
        this.lastEventNum = lastBlock.header.eventNumOffset + BigInt(lastBlock.events.length)
        // append the minipool events
        this.appendStreamAndCookie(streamAndCookie, emitter)
        // let everyone know
        emitter?.emit('streamInitialized', this.streamId, this.contentKind)
    }

    appendEvents(
        streamAndCookie: StreamAndCookie,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const { appended, updated } = this.appendStreamAndCookie(streamAndCookie, emitter)
        emitter?.emit('streamUpdated', this.streamId, this.contentKind, { appended, updated })
    }

    prependEvents(
        miniblocks: Miniblock[],
        terminus: boolean,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const unpackedMiniblocks = miniblocks.map((mb) => unpackMiniblock(mb))
        const prepended = unpackedMiniblocks.flatMap((mb) =>
            mb.events.map((e, i) =>
                makeRemoteTimelineEvent(e, mb.header.eventNumOffset + BigInt(i)),
            ),
        )
        this.timeline.unshift(...prepended)
        // prepend the new block events in reverse order
        for (let i = prepended.length - 1; i >= 0; i--) {
            this.processPrependedEvent(prepended[i], emitter)
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
        switch (this.contentKind) {
            case 'channelContent':
                return this.channelContent.memberships
            case 'dmChannelContent':
                return this.dmChannelContent.memberships
            case 'gdmChannelContent':
                return this.gdmChannelContent.memberships
            case 'spaceContent':
                return this.spaceContent.memberships
            case 'userContent':
                throw new Error('User content has no memberships')
            case 'userSettingsContent':
                throw new Error('User settings content has no memberships')
            case 'userDeviceKeyContent':
                throw new Error('User device key content has no memberships')
            case 'mediaContent':
                throw new Error('Media content has no memberships')
            case undefined:
                throw new Error('Stream has no content')
            default:
                logNever(this.contentKind)
                return new StreamStateView_Membership('', '')
        }
    }

    getContent(): StreamStateView_IContent {
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
            case 'mediaContent':
                return this.mediaContent
            case undefined:
                throw new Error('Stream has no content')
            default:
                logNever(this.contentKind)
                return new StreamStateView_UnknownContent()
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
                return this.getMemberships().isMember(MembershipOp.SO_JOIN, userId)
            case 'dmChannelContent':
                return this.dmChannelContent.participants().has(userId)
            case 'gdmChannelContent':
                return this.gdmChannelContent.joinedOrInvitedParticipants().has(userId)
            default:
                throw new Error('Stream does not support key exchange')
        }
    }
}
