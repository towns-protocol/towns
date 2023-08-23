import { dlog } from './dlog'
import { Err, SnapshotCaseType, SyncCookie, StreamAndCookie, Snapshot } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { check, logNever, isDefined, throwWithCode } from './check'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
import { unpackEnvelopes } from './sign'
import { EmittedEvents } from './client'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
import { StreamStateView_Membership } from './streamStateView_Membership'

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

    constructor(streamId: string, snapshot: Snapshot | undefined) {
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
                this._channelContent = new StreamStateView_Channel(snapshot.content.value.inception)
                break
            case 'spaceContent':
                this._spaceContent = new StreamStateView_Space(snapshot.content.value.inception)
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
            case undefined:
                check(false, `Snapshot has no content ${streamId}`, Err.STREAM_BAD_EVENT)
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

    private appendEvent(event: ParsedEvent, emitter?: TypedEmitter<EmittedEvents>): void {
        if (this.events.has(event.hashStr)) {
            return
        }

        for (const prev of event.prevEventsStrs ?? []) {
            check(
                this.events.has(prev),
                `Can't add event with unknown prevEvent ${prev}, hash=${event.hashStr}, stream=${this.streamId}`,
                Err.STREAM_BAD_EVENT,
            )
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
                case 'miniblockHeader':
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
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        const events = this.appendStreamAndCookie(streamAndCookie, emitter)
        emitter?.emit('streamInitialized', this.streamId, this.contentKind, events)
    }

    appendEvents(
        streamAndCookie: StreamAndCookie,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        const events = this.appendStreamAndCookie(streamAndCookie, emitter)
        emitter?.emit('streamUpdated', this.streamId, this.contentKind, events)
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
            case undefined:
                throw new Error('Stream has no content')
            default:
                logNever(this.contentKind)
                return new StreamStateView_Membership()
        }
    }
}
