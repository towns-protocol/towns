import {
    FullyReadMarker,
    FullyReadMarkers,
    Snapshot,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_MarkerContent,
    UserSettingsPayload_Snapshot,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_Snapshot_UserBlocks_Block,
    UserSettingsPayload_UserBlock,
} from '@river-build/proto'
import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check, dlog } from '@river-build/dlog'
import { logNever } from './check'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { toPlainMessage } from '@bufbuild/protobuf'
import { streamIdFromBytes, userIdFromAddress } from './id'

const log = dlog('csb:stream')

export class StreamStateView_UserSettings extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly settings = new Map<string, string>()
    readonly fullyReadMarkersSrc = new Map<string, UserSettingsPayload_MarkerContent>()
    readonly fullyReadMarkers = new Map<string, Record<string, FullyReadMarker>>()
    readonly userBlocks: Record<string, UserSettingsPayload_Snapshot_UserBlocks> = {}

    constructor(streamId: string) {
        super()
        this.streamId = streamId
    }

    applySnapshot(snapshot: Snapshot, content: UserSettingsPayload_Snapshot): void {
        // iterate over content.fullyReadMarkers
        for (const payload of content.fullyReadMarkers) {
            this.fullyReadMarkerUpdate(payload)
        }

        for (const userBlocks of content.userBlocksList) {
            const userId = userIdFromAddress(userBlocks.userId)
            this.userBlocks[userId] = userBlocks
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userSettingsPayload')
        const payload: UserSettingsPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                // handled in snapshot
                break
            case 'userBlock':
                // handled in snapshot
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userSettingsPayload')
        const payload: UserSettingsPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'fullyReadMarkers':
                this.fullyReadMarkerUpdate(payload.content.value, stateEmitter)
                break
            case 'userBlock':
                this.userBlockUpdate(payload.content.value, stateEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private fullyReadMarkerUpdate(
        payload: UserSettingsPayload_FullyReadMarkers,
        emitter?: TypedEmitter<StreamStateEvents>,
    ): void {
        const { content } = payload
        log('$ fullyReadMarkerUpdate', { content })
        if (content === undefined) {
            log('$ Content with FullyReadMarkers is undefined')
            return
        }
        const streamId = streamIdFromBytes(payload.streamId)
        this.fullyReadMarkersSrc.set(streamId, content)
        const fullyReadMarkersContent = toPlainMessage(
            FullyReadMarkers.fromJsonString(content.data),
        )

        this.fullyReadMarkers.set(streamId, fullyReadMarkersContent.markers)
        emitter?.emit('fullyReadMarkersUpdated', streamId, fullyReadMarkersContent.markers)
    }

    private userBlockUpdate(
        payload: UserSettingsPayload_UserBlock,
        emitter?: TypedEmitter<StreamStateEvents>,
    ): void {
        const userId = userIdFromAddress(payload.userId)
        if (!this.userBlocks[userId]) {
            this.userBlocks[userId] = new UserSettingsPayload_Snapshot_UserBlocks()
        }
        this.userBlocks[userId].blocks.push(payload)
        emitter?.emit('userBlockUpdated', payload)
    }

    isUserBlocked(userId: string): boolean {
        const latestBlock = this.getLastBlock(userId)
        if (latestBlock === undefined) {
            return false
        }
        return latestBlock.isBlocked
    }

    isUserBlockedAt(userId: string, eventNum: bigint): boolean {
        let isBlocked = false
        for (const block of this.userBlocks[userId]?.blocks ?? []) {
            if (eventNum >= block.eventNum) {
                isBlocked = block.isBlocked
            }
        }
        return isBlocked
    }

    getLastBlock(userId: string): UserSettingsPayload_Snapshot_UserBlocks_Block | undefined {
        const blocks = this.userBlocks[userId]?.blocks
        if (!blocks || blocks.length === 0) {
            return undefined
        }
        return blocks[blocks.length - 1]
    }
}
