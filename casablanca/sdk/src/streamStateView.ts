import { dlog } from './dlog'
import {
    Err,
    SnapshotCaseType,
    SyncCookie,
    StreamAndCookie,
    Snapshot,
    Miniblock,
    MiniblockHeader,
} from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { check, logNever, isDefined, throwWithCode } from './check'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
import { unpackEnvelopes, unpackMiniblock } from './sign'
import { EmittedEvents } from './client'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
import { StreamStateView_Membership } from './streamStateView_Membership'
import { StreamStateView_Media } from './streamStateView_Media'

const log = dlog('csb:streams')

export class StreamStateView {
    readonly streamId: string
    readonly contentKind: SnapshotCaseType
    readonly timeline: ParsedEvent[] = []
    readonly events = new Map<string, ParsedEvent>()
    // todo: remove this additional map in favor of events map once RiverEvent decrypts to ParsedEvents
    // https://linear.app/hnt-labs/issue/HNT-2049/refactor-riverevent-to-input-and-output-streamevents
    readonly decryptedEvents = new Map<string, RiverEvent>()
    readonly leafEventHashes = new Map<string, Uint8Array>()

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

    constructor(userId: string, streamId: string, snapshot: Snapshot | undefined) {
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

        this.streamId = streamId
        this.contentKind = snapshot.content.case

        switch (snapshot.content.case) {
            case 'channelContent':
                this._channelContent = new StreamStateView_Channel(
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
    ): ParsedEvent[] {
        const events = unpackEnvelopes(streamAndCookie.events)
        for (const event of events) {
            this.appendEvent(event, emitter)
        }
        this.syncCookie = streamAndCookie.nextSyncCookie
        return events
    }

    private appendEvent(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (this.events.has(event.hashStr)) {
            return
        }

        for (const prev of event.prevEventsStrs ?? []) {
            if (!this.events.has(prev)) {
                log(
                    `Adding event with unknown prevEvent ${prev}, hash=${event.hashStr}, stream=${this.streamId}`,
                )
            }
        }

        this.timeline.push(event)
        this.events.set(event.hashStr, event)
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
                    this.updateMiniblockInfo(payload.value, { max: payload.value.miniblockNum })
                    break
                case undefined:
                    break
                default:
                    logNever(payload)
            }
        } catch (e) {
            log(`Error processing event ${event.hashStr}`, e)
        }
    }

    private prependEvent(
        event: ParsedEvent,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        if (this.events.has(event.hashStr)) {
            return
        }

        // not exactly a hack, but if this is the first event, we need to
        // save the hash so that we can submit new events to this stream
        if (this.timeline.length === 0) {
            this.leafEventHashes.set(event.hashStr, event.envelope.hash)
        }

        this.timeline.unshift(event)
        this.events.set(event.hashStr, event)

        const payload = event.event.payload
        check(isDefined(payload), `Event has no payload ${event.hashStr}`, Err.STREAM_BAD_EVENT)

        try {
            switch (payload.case) {
                case 'channelPayload':
                    this.channelContent?.prependEvent(event, payload.value, emitter)
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
                    break
                case undefined:
                    break
                default:
                    logNever(payload)
            }
        } catch (e) {
            log(`Error processing event ${event.hashStr}`, e)
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
    updateDecrypted(event: RiverEvent): void {
        const hashStr = event.getId()
        if (!hashStr) {
            log(`Ignoring decrypted event with no hash id`)
            return
        }
        if (event.shouldAttemptDecryption()) {
            log(`Ignoring event that has not attempted decryption yet, hash=${hashStr}`)
            return
        }

        if (this.decryptedEvents.has(hashStr)) {
            const isDecryptionFailure = event.isDecryptionFailure()
            const existingDecrypted = this.decryptedEvents.get(hashStr)
            if (isDecryptionFailure == existingDecrypted?.isDecryptionFailure()) {
                log(
                    `Ignoring duplicate decrypted event with unchanged decryption status ${hashStr}`,
                )
                return
            }
        }
        if (event.getStreamId() !== this.streamId) {
            throwWithCode(
                `Event does not exist on stream for decrypted event, hash=${hashStr}, stream=${this.streamId}`,
                Err.STREAM_BAD_EVENT,
            )
        }

        this.decryptedEvents.set(hashStr, event)
    }

    initialize(
        streamAndCookie: StreamAndCookie,
        snapshot: Snapshot,
        miniblocks: Miniblock[],
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(miniblocks.length > 0, `Stream has no miniblocks ${this.streamId}`, Err.STREAM_EMPTY)
        // initialize from snapshot data, this gets all memberships and channel data, etc
        this.initializeFromSnapshot(snapshot, emitter)
        // initialize from miniblocks, the first minblock is the snapshot block, it's events are accounted for
        const block0 = unpackMiniblock(miniblocks[0])
        // the rest need to be added to the timeline
        const rest = miniblocks.slice(1).flatMap((mb) => unpackMiniblock(mb))
        // prepend the snapshotted block in reverse order
        for (let i = block0.length - 1; i >= 0; i--) {
            const event = block0[i]
            this.prependEvent(event, emitter)
        }
        // append the new block events
        for (const event of rest) {
            this.appendEvent(event, emitter)
        }
        // append the minipool events
        const minipoolEvents = this.appendStreamAndCookie(streamAndCookie, emitter)
        // let everyone know
        emitter?.emit('streamInitialized', this.streamId, this.contentKind, [
            ...block0,
            ...rest,
            ...minipoolEvents,
        ])
    }

    appendEvents(
        streamAndCookie: StreamAndCookie,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const events = this.appendStreamAndCookie(streamAndCookie, emitter)
        emitter?.emit('streamUpdated', this.streamId, this.contentKind, events)
    }

    prependEvents(
        miniblocks: Miniblock[],
        terminus: boolean,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const events = miniblocks.flatMap((mb) => unpackMiniblock(mb))
        // prepend the new block events in reverse order
        for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i]
            this.prependEvent(event, emitter)
        }

        if (this.miniblockInfo && terminus) {
            this.miniblockInfo.terminusReached = true
        }

        emitter?.emit('streamEventsPrepended', this.streamId, this.contentKind, events)
    }

    getMemberships(): StreamStateView_Membership {
        switch (this.contentKind) {
            case 'channelContent':
                return this.channelContent.memberships
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
}
