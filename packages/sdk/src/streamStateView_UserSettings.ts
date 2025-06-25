import {
    FullyReadMarker,
    FullyReadMarkersSchema,
    PlainMessage,
    Snapshot,
    UserSettingsPayload,
    UserSettingsPayload_FullyReadMarkers,
    UserSettingsPayload_Snapshot,
    UserSettingsPayload_Snapshot_UserBlocks,
    UserSettingsPayload_Snapshot_UserBlocks_Block,
    UserSettingsPayload_Snapshot_UserBlocks_BlockSchema,
    UserSettingsPayload_UserBlock,
} from '@towns-protocol/proto'
import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { check, dlog } from '@towns-protocol/dlog'
import { logNever } from './check'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { create, fromJsonString } from '@bufbuild/protobuf'
import { streamIdFromBytes, userIdFromAddress } from './id'
import {
    UserSettingsStreamModel,
    UserSettingsStreamsView,
} from './views/streams/userSettingsStreams'

const log = dlog('csb:stream')

export class StreamStateView_UserSettings extends StreamStateView_AbstractContent {
    readonly streamId: string

    get fullyReadMarkers(): Record<string, Record<string, FullyReadMarker>> {
        return this.userSettingsStreamModel.fullyReadMarkers
    }
    get userBlocks(): Record<string, UserSettingsPayload_Snapshot_UserBlocks> {
        return this.userSettingsStreamModel.userBlocks
    }

    get userSettingsStreamModel(): UserSettingsStreamModel {
        return this.userSettingsStreamsView.get(this.streamId)
    }

    constructor(
        streamId: string,
        private readonly userSettingsStreamsView: UserSettingsStreamsView,
    ) {
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
            this.userSettingsStreamsView.setUserBlocks(this.streamId, userId, userBlocks)
        }
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
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
        _cleartext: Uint8Array | string | undefined,
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
        const fullyReadMarkersContent = fromJsonString(FullyReadMarkersSchema, content.data)

        this.userSettingsStreamsView.setFullyReadMarkers(
            this.streamId,
            streamId,
            fullyReadMarkersContent.markers,
        )
        emitter?.emit('fullyReadMarkersUpdated', streamId, fullyReadMarkersContent.markers)
    }

    private userBlockUpdate(
        payload: UserSettingsPayload_UserBlock,
        emitter?: TypedEmitter<StreamStateEvents>,
    ): void {
        const userId = userIdFromAddress(payload.userId)
        const userBlock = create(UserSettingsPayload_Snapshot_UserBlocks_BlockSchema, {
            eventNum: payload.eventNum,
            isBlocked: payload.isBlocked,
        } satisfies PlainMessage<UserSettingsPayload_Snapshot_UserBlocks_Block>)
        this.userSettingsStreamsView.updateUserBlock(this.streamId, userId, userBlock)
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
