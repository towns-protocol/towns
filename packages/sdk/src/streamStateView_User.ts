import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import {
    MembershipOp,
    Snapshot,
    UserPayload,
    UserPayload_Snapshot,
    UserPayload_UserMembership,
} from '@towns-protocol/proto'
import { StreamEncryptionEvents, StreamEvents, StreamStateEvents } from './streamEvents'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { bin_toHexString, check } from '@towns-protocol/dlog'
import { logNever } from './check'
import { streamIdFromBytes } from './id'
import { utils } from 'ethers'
import { UserStreamModel, UserStreamsView } from './views/streams/userStreamsView'

export class StreamStateView_User extends StreamStateView_AbstractContent {
    readonly streamId: string
    get streamMemberships() {
        return this.userStreamModel.streamMemberships
    }
    get tipsSent() {
        return this.userStreamModel.tipsSent
    }
    get tipsReceived() {
        return this.userStreamModel.tipsReceived
    }
    get tipsSentCount() {
        return this.userStreamModel.tipsSentCount
    }
    get tipsReceivedCount() {
        return this.userStreamModel.tipsReceivedCount
    }
    get tokenTransfers() {
        return this.userStreamModel.tokenTransfers
    }

    get userStreamModel(): UserStreamModel {
        return this.userStreamsView.get(this.streamId)
    }

    constructor(
        streamId: string,
        private readonly userStreamsView: UserStreamsView,
    ) {
        super()
        this.streamId = streamId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // initialize memberships
        for (const payload of content.memberships) {
            this.addUserPayload_userMembership(payload, encryptionEmitter)
        }
        this.userStreamsView.setTips(this.streamId, {
            tipsSent: { ...content.tipsSent },
            tipsReceived: { ...content.tipsReceived },
            tipsSentCount: { ...content.tipsSentCount },
            tipsReceivedCount: { ...content.tipsReceivedCount },
        })
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userPayload')
        const payload: UserPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                // memberships are handled in the snapshot
                break
            case 'userMembershipAction':
                break
            case 'blockchainTransaction':
                {
                    const transactionContent = payload.content.value.content
                    switch (transactionContent?.case) {
                        case 'tokenTransfer':
                            this.userStreamsView.prependTokenTransfer(
                                this.streamId,
                                transactionContent.value,
                            )
                            break
                        default:
                            break
                    }
                }
                break
            case 'receivedBlockchainTransaction':
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userPayload')
        const payload: UserPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userMembership':
                this.addUserPayload_userMembership(payload.content.value, stateEmitter)
                break
            case 'userMembershipAction':
                break
            case 'blockchainTransaction': {
                const transactionContent = payload.content.value.content
                switch (transactionContent?.case) {
                    case undefined:
                        break
                    case 'tip': {
                        const event = transactionContent.value.event
                        if (!event) {
                            return
                        }
                        const currency = utils.getAddress(bin_toHexString(event.currency))
                        this.userStreamsView.appendTipSent(this.streamId, currency, event.amount)
                        stateEmitter?.emit('userTipSent', this.streamId, currency, event.amount)
                        break
                    }
                    case 'tokenTransfer':
                        this.userStreamsView.appendTokenTransfer(
                            this.streamId,
                            transactionContent.value,
                        )
                        break
                    case 'spaceReview': {
                        // user left a review on a space
                        break
                    }
                    default:
                        logNever(transactionContent)
                        break
                }
                break
            }
            case 'receivedBlockchainTransaction': {
                const transactionContent = payload.content.value.transaction?.content
                switch (transactionContent?.case) {
                    case undefined:
                        break
                    case 'tip': {
                        const event = transactionContent.value.event
                        if (!event) {
                            return
                        }
                        const currency = utils.getAddress(bin_toHexString(event.currency))
                        this.userStreamsView.appendTipReceived(
                            this.streamId,
                            currency,
                            event.amount,
                        )
                        stateEmitter?.emit('userTipReceived', this.streamId, currency, event.amount)
                        break
                    }
                    case 'tokenTransfer':
                        break
                    case 'spaceReview': {
                        // user left a review on a space
                        break
                    }
                    default:
                        logNever(transactionContent)
                        break
                }
                break
            }
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserPayload_userMembership(
        payload: UserPayload_UserMembership,
        emitter: TypedEmitter<StreamEvents> | undefined,
    ): void {
        const { op, streamId: inStreamId } = payload
        const streamId = streamIdFromBytes(inStreamId)
        const wasInvited = this.streamMemberships[streamId]?.op === MembershipOp.SO_INVITE
        const wasJoined = this.streamMemberships[streamId]?.op === MembershipOp.SO_JOIN
        this.userStreamsView.setMembership(this.streamId, streamId, payload)
        switch (op) {
            case MembershipOp.SO_INVITE:
                emitter?.emit('userInvitedToStream', streamId)
                emitter?.emit('userStreamMembershipChanged', streamId, payload)
                break
            case MembershipOp.SO_JOIN:
                emitter?.emit('userJoinedStream', streamId)
                emitter?.emit('userStreamMembershipChanged', streamId, payload)
                break
            case MembershipOp.SO_LEAVE:
                if (wasInvited || wasJoined) {
                    emitter?.emit('userLeftStream', streamId)
                    emitter?.emit('userStreamMembershipChanged', streamId, payload)
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }

    getMembership(streamId: string): UserPayload_UserMembership | undefined {
        return this.streamMemberships[streamId]
    }

    isMember(streamId: string, membership: MembershipOp): boolean {
        return this.getMembership(streamId)?.op === membership
    }

    isJoined(streamId: string): boolean {
        return this.isMember(streamId, MembershipOp.SO_JOIN)
    }
}
