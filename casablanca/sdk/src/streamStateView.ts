import { dlog } from './dlog'
import { Err, PayloadCaseType, SyncCookie, StreamAndCookie } from '@river/proto'
import TypedEmitter from 'typed-emitter'
import { check, checkNever, isDefined, throwWithCode } from './check'
import { ParsedEvent } from './types'
import { RiverEvent } from './event'
import isEqual from 'lodash/isEqual'
import { unpackEnvelopes } from './sign'
import { EmittedEvents } from './client'
import { StreamStateView_Space } from './streamStateView_Space'
import { StreamStateView_Channel } from './streamStateView_Channel'
import { StreamStateView_User } from './streamStateView_User'
import { StreamStateView_UserSettings } from './streamStateView_UserSettings'
import { StreamStateView_UserDeviceKeys } from './streamStateView_UserDeviceKey'
import { StreamStateView_Membership } from './streamStateView_Membership'

const log = dlog('csb:streams')

const isCookieEqual = (a?: SyncCookie, b?: SyncCookie): boolean => isEqual(a, b)

export class StreamStateView {
    readonly streamId: string

    readonly payloadKind: PayloadCaseType

    readonly timeline: ParsedEvent[] = []
    readonly events = new Map<string, ParsedEvent>()

    // todo: remove this additional map in favor of events map once RiverEvent decrypts to ParsedEvents
    // https://linear.app/hnt-labs/issue/HNT-2049/refactor-riverevent-to-input-and-output-streamevents
    readonly decryptedEvents = new Map<string, RiverEvent>()

    readonly leafEventHashes = new Map<string, Uint8Array>()

    syncCookie?: SyncCookie
    maxOldInstanceBlockNumber = -1n

    // Space Content
    private readonly _spaceContent?: StreamStateView_Space
    get spaceContent(): StreamStateView_Space {
        check(isDefined(this._spaceContent), `spaceContent not defined for ${this.payloadKind}`)
        return this._spaceContent
    }

    // Channel Content
    private readonly _channelContent?: StreamStateView_Channel
    get channelContent(): StreamStateView_Channel {
        check(isDefined(this._channelContent), `channelContent not defined for ${this.payloadKind}`)
        return this._channelContent
    }

    // User Content
    private readonly _userContent?: StreamStateView_User
    get userContent(): StreamStateView_User {
        check(isDefined(this._userContent), `userContent not defined for ${this.payloadKind}`)
        return this._userContent
    }

    // User Settings Content
    private readonly _userSettingsContent?: StreamStateView_UserSettings
    get userSettingsContent(): StreamStateView_UserSettings {
        check(
            isDefined(this._userSettingsContent),
            `userSettingsContent not defined for ${this.payloadKind}`,
        )
        return this._userSettingsContent
    }

    private readonly _userDeviceKeyContent?: StreamStateView_UserDeviceKeys
    get userDeviceKeyContent(): StreamStateView_UserDeviceKeys {
        check(
            isDefined(this._userDeviceKeyContent),
            `userDeviceKeyContent not defined for ${this.payloadKind}`,
        )
        return this._userDeviceKeyContent
    }

    constructor(streamId: string, inceptionEvent: ParsedEvent | undefined) {
        check(isDefined(inceptionEvent), `Stream is empty ${streamId}`, Err.STREAM_EMPTY)
        check(
            inceptionEvent.event.payload?.value?.content.case === 'inception',
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        const inceptionPayload = inceptionEvent.event.payload?.value?.content.value
        check(
            isDefined(inceptionPayload),
            `First event is not inception ${streamId}`,
            Err.STREAM_BAD_EVENT,
        )
        check(
            inceptionPayload.streamId === streamId,
            `Non-matching stream id in inception ${streamId} != ${inceptionPayload.streamId}`,
            Err.STREAM_BAD_EVENT,
        )

        this.streamId = streamId
        this.payloadKind = inceptionEvent.event.payload.case

        switch (inceptionEvent.event.payload.case) {
            case 'channelPayload':
                this._channelContent = new StreamStateView_Channel(
                    inceptionEvent.event.payload?.value?.content.value,
                )
                break
            case 'spacePayload':
                this._spaceContent = new StreamStateView_Space(
                    inceptionEvent.event.payload?.value?.content.value,
                )
                break
            case 'userPayload':
                this._userContent = new StreamStateView_User(
                    inceptionEvent.event.payload?.value?.content.value,
                )
                break
            case 'userSettingsPayload':
                this._userSettingsContent = new StreamStateView_UserSettings(
                    inceptionEvent.event.payload?.value?.content.value,
                )
                break
            case 'userDeviceKeyPayload':
                this._userDeviceKeyContent = new StreamStateView_UserDeviceKeys(
                    inceptionEvent.event.payload?.value?.content.value,
                )
                break
            case 'miniblockHeader':
                check(false, `Miniblock header not supported ${streamId}`, Err.STREAM_BAD_EVENT)
                break
            case undefined:
                check(false, `Inception has no payload ${streamId}`, Err.STREAM_BAD_EVENT)
                break
            default:
                checkNever(inceptionEvent.event.payload)
        }
    }

    private addEvent(
        event: ParsedEvent,
        ignoreExisting: boolean,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        if (this.events.has(event.hashStr)) {
            if (ignoreExisting) {
                return
            } else {
                throwWithCode(
                    `Can't add same event twice, hash=${event.hashStr}, stream=${this.streamId}`,
                    Err.STREAM_BAD_EVENT,
                )
            }
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

        if (payload.value?.content?.case === 'inception') {
            emitter?.emit('streamInception', this.streamId, event.event)
        }

        try {
            switch (payload.case) {
                case 'channelPayload':
                    this.channelContent?.addEvent(event, payload.value, emitter)
                    break
                case 'spacePayload':
                    this.spaceContent?.addEvent(event, payload.value, emitter)
                    break
                case 'userPayload':
                    this.userContent?.addEvent(event, payload.value, emitter)
                    break
                case 'userSettingsPayload':
                    this.userSettingsContent?.addEvent(event, payload.value, emitter)
                    break
                case 'userDeviceKeyPayload':
                    this.userDeviceKeyContent?.addEvent(event, payload.value, emitter)
                    break
                case 'miniblockHeader':
                    break
                case undefined:
                    break
                default:
                    checkNever(payload)
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
            log(`Ignoring event that has not attampted decryption yet, hash=${hashStr}`)
            return
        }
        if (event.isDecryptionFailure()) {
            log(`Ignoring event that failed decryption, hash=${hashStr}`)
            return
        }
        if (this.decryptedEvents.has(hashStr)) {
            log(`Ignoring duplicate decrypted event ${hashStr}`)
            return
        }
        if (event.getStreamId() !== this.streamId) {
            throwWithCode(
                `Event does not exist on stream for decrypted event, hash=${hashStr}, stream=${this.streamId}`,
                Err.STREAM_BAD_EVENT,
            )
        }

        this.decryptedEvents.set(hashStr, event)
    }

    update(
        streamAndCookie: StreamAndCookie,
        emitter?: TypedEmitter<EmittedEvents>,
        init?: boolean,
    ): void {
        const events = unpackEnvelopes(streamAndCookie.events)

        let ignoreExisting = false

        if (!init) {
            if (isCookieEqual(this.syncCookie, streamAndCookie.originalSyncCookie)) {
                ignoreExisting =
                    streamAndCookie.nextSyncCookie!.miniblockNum <= this.maxOldInstanceBlockNumber
            } else {
                // Minipool instance changed, duplicate events are possible.
                ignoreExisting = true
                if (streamAndCookie.nextSyncCookie!.miniblockNum > this.maxOldInstanceBlockNumber) {
                    this.maxOldInstanceBlockNumber = streamAndCookie.nextSyncCookie!.miniblockNum
                }
            }
        }

        for (const event of events) {
            this.addEvent(event, ignoreExisting, emitter)
        }
        this.syncCookie = streamAndCookie.nextSyncCookie

        if (emitter !== undefined) {
            if (init ?? false) {
                emitter.emit('streamInitialized', this.streamId, this.payloadKind, events)
            } else {
                emitter.emit('streamUpdated', this.streamId, this.payloadKind, events)
            }
        }
    }

    getMemberships(): StreamStateView_Membership {
        switch (this.payloadKind) {
            case 'channelPayload':
                return this.channelContent.memberships
            case 'spacePayload':
                return this.spaceContent.memberships
            case 'userPayload':
                throw new Error('User content has no memberships')
            case 'userSettingsPayload':
                throw new Error('User settings content has no memberships')
            case 'userDeviceKeyPayload':
                throw new Error('User device key content has no memberships')
            case 'miniblockHeader':
                throw new Error('Miniblock header has no memberships')
            case undefined:
                throw new Error('Stream has no content')
            default:
                checkNever(this.payloadKind)
        }
    }
}
