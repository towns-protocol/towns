import {
    MembershipOp,
    MemberPayload,
    Snapshot,
    WrappedEncryptedData,
    MemberPayload_Nft,
    MemberPayload_MemberBlockchainTransaction,
    BlockchainTransaction_TokenTransfer,
    WrappedEncryptedDataSchema,
    MemberPayload_Membership,
} from '@towns-protocol/proto'
import TypedEmitter from 'typed-emitter'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import {
    ConfirmedTimelineEvent,
    ParsedEvent,
    RemoteTimelineEvent,
    StreamTimelineEvent,
    getEventSignature,
    makeRemoteTimelineEvent,
} from './types'
import { isDefined, logNever } from './check'
import { userIdFromAddress } from './id'
import { StreamStateView_Members_Solicitations } from './streamStateView_Members_Solicitations'
import { bin_toHexString, check, dlog } from '@towns-protocol/dlog'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamStateView_MemberMetadata } from './streamStateView_MemberMetadata'
import { KeySolicitationContent } from './decryptionExtensions'
import { makeParsedEvent } from './sign'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { utils } from 'ethers'
import { create } from '@bufbuild/protobuf'
import { getSpaceReviewEventDataBin, SpaceReviewEventObject } from '@towns-protocol/web3'
import { StreamMemberIdsView } from './views/streams/streamMemberIds'

const log = dlog('csb:streamStateView_Members')

export type StreamMember = {
    userId: string
    userAddress: Uint8Array
    miniblockNum?: bigint
    eventNum?: bigint
    solicitations: KeySolicitationContent[]
    encryptedUsername?: WrappedEncryptedData
    encryptedDisplayName?: WrappedEncryptedData
    ensAddress?: Uint8Array
    nft?: MemberPayload_Nft
    tipsSent?: { [key: string]: bigint }
    tipsReceived?: { [key: string]: bigint }
    tipsSentCount?: { [key: string]: bigint }
    tipsReceivedCount?: { [key: string]: bigint }
}

export interface Pin {
    creatorUserId: string
    event: StreamTimelineEvent
}

export interface MemberTokenTransfer {
    address: Uint8Array
    amount: bigint
    isBuy: boolean
    chainId: string
    userId: string
    sender: Uint8Array
    createdAtEpochMs: bigint
    messageId: string
}

export interface MemberSpaceReview {
    review: SpaceReviewEventObject
    createdAtEpochMs: bigint
    eventHashStr: string
}

export class StreamStateView_Members extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly joined = new Map<string, StreamMember>()
    readonly joinedUsers = new Set<string>()
    readonly invitedUsers = new Set<string>()
    readonly leftUsers = new Set<string>()
    readonly pendingJoinedUsers = new Set<string>()
    readonly pendingInvitedUsers = new Set<string>()
    readonly pendingLeftUsers = new Set<string>()
    readonly pendingMembershipEvents = new Map<string, MemberPayload_Membership>()
    readonly solicitHelper: StreamStateView_Members_Solicitations
    readonly memberMetadata: StreamStateView_MemberMetadata
    readonly pins: Pin[] = []
    tips: { [key: string]: bigint } = {}
    tipsCount: { [key: string]: bigint } = {}
    encryptionAlgorithm?: string = undefined
    spaceReviews: MemberSpaceReview[] = []

    tokenTransfers: MemberTokenTransfer[] = []

    get streamMemberIds(): string[] {
        return this.streamMemberIdsView.get(this.streamId)
    }

    constructor(
        streamId: string,
        currentUserId: string,
        private streamMemberIdsView: StreamMemberIdsView,
    ) {
        super()
        this.streamId = streamId
        this.solicitHelper = new StreamStateView_Members_Solicitations(streamId)
        this.memberMetadata = new StreamStateView_MemberMetadata(streamId, currentUserId)
    }

    // initialization
    applySnapshot(
        event: ParsedEvent,
        snapshot: Snapshot,
        cleartexts: Record<string, Uint8Array | string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (!snapshot.members) {
            return
        }
        const memberIds: string[] = []
        for (const member of snapshot.members.joined) {
            const userId = userIdFromAddress(member.userAddress)
            memberIds.push(userId)
            this.joined.set(userId, {
                userId,
                userAddress: member.userAddress,
                miniblockNum: member.miniblockNum,
                eventNum: member.eventNum,
                solicitations: member.solicitations.map(
                    (s) =>
                        ({
                            deviceKey: s.deviceKey,
                            fallbackKey: s.fallbackKey,
                            isNewDevice: s.isNewDevice,
                            sessionIds: [...s.sessionIds],
                        }) satisfies KeySolicitationContent,
                ),
                encryptedUsername: member.username,
                encryptedDisplayName: member.displayName,
                ensAddress: member.ensAddress,
                nft: member.nft,
                tipsSent: member.tipsSent,
                tipsReceived: member.tipsReceived,
                tipsSentCount: member.tipsSentCount,
                tipsReceivedCount: member.tipsReceivedCount,
            })
            this.applyMembershipEvent(userId, MembershipOp.SO_JOIN, 'confirmed', undefined)
        }
        this.streamMemberIdsView.setMembers(this.streamId, memberIds)
        // user/display names were ported from an older implementation and could be simpler
        const usernames = Array.from(this.joined.values())
            .filter((x) => isDefined(x.encryptedUsername))
            .map((member) => ({
                userId: member.userId,
                wrappedEncryptedData: member.encryptedUsername!,
            }))
        const displayNames = Array.from(this.joined.values())
            .filter((x) => isDefined(x.encryptedDisplayName))
            .map((member) => ({
                userId: member.userId,
                wrappedEncryptedData: member.encryptedDisplayName!,
            }))
        const ensAddresses = Array.from(this.joined.values())
            .filter((x) => isDefined(x.ensAddress))
            .map((member) => ({
                userId: member.userId,
                ensAddress: member.ensAddress!,
            }))
        const nfts = Array.from(this.joined.values())
            .filter((x) => isDefined(x.nft))
            .map((member) => ({
                userId: member.userId,
                nft: member.nft!,
            }))

        this.memberMetadata.applySnapshot(
            usernames,
            displayNames,
            ensAddresses,
            nfts,
            cleartexts,
            encryptionEmitter,
        )
        const sigBundle = getEventSignature(event)
        this.solicitHelper.initSolicitations(
            event.hashStr,
            Array.from(this.joined.values()),
            sigBundle,
            encryptionEmitter,
        )

        snapshot.members?.pins.forEach((snappedPin) => {
            if (snappedPin.pin?.event) {
                const parsedEvent = makeParsedEvent(
                    snappedPin.pin.event,
                    snappedPin.pin.eventId,
                    undefined,
                )
                const remoteEvent = makeRemoteTimelineEvent({ parsedEvent, eventNum: 0n })
                const cleartext = cleartexts?.[remoteEvent.hashStr]
                this.addPin(
                    userIdFromAddress(snappedPin.creatorAddress),
                    remoteEvent,
                    cleartext,
                    encryptionEmitter,
                    undefined,
                )
            }
        })

        this.tips = { ...snapshot.members.tips }
        this.tipsCount = { ...snapshot.members.tipsCount }
        this.encryptionAlgorithm = snapshot.members.encryptionAlgorithm?.algorithm
    }

    prependEvent(
        event: RemoteTimelineEvent,
        _cleartext: Uint8Array | string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'memberPayload')
        const payload: MemberPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'memberBlockchainTransaction': {
                const receipt = payload.content.value.transaction?.receipt
                const transactionContent = payload.content.value.transaction?.content
                switch (transactionContent?.case) {
                    case 'spaceReview': {
                        // space reviews need to be prepended
                        if (!receipt) {
                            return
                        }
                        if (!transactionContent.value.event) {
                            return
                        }
                        const review = getSpaceReviewEventDataBin(
                            receipt.logs,
                            transactionContent.value.event.user,
                        )
                        const existingReview = this.spaceReviews.find(
                            (r) => r.review.user === review.user,
                        )
                        // since we're prepending, existing reviews are newer and should be kept
                        if (!existingReview) {
                            this.spaceReviews.unshift({
                                review: review,
                                createdAtEpochMs: event.createdAtEpochMs,
                                eventHashStr: event.hashStr,
                            })
                            stateEmitter?.emit('spaceReviewsUpdated', this.streamId, review)
                        }
                        break
                    }
                    case 'tokenTransfer': {
                        this.addTokenTransfer(
                            payload.content.value,
                            transactionContent.value,
                            event.createdAtEpochMs,
                            stateEmitter,
                            true,
                        )
                        break
                    }
                    default:
                        break
                }
                break
            }
            default:
                break
        }
    }

    /**
     * Places event in a pending queue, to be applied when the event is confirmed in a miniblock header
     */
    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'memberPayload')
        const payload: MemberPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'membership':
                {
                    const membership = payload.content.value
                    this.pendingMembershipEvents.set(event.hashStr, membership)
                    const userId = userIdFromAddress(membership.userAddress)
                    switch (membership.op) {
                        case MembershipOp.SO_JOIN:
                            if (this.joined.has(userId)) {
                                // aellis 12/24 there is a real bug here, not sure why we
                                // are getting duplicate join events
                                log('user already joined', this.streamId, userId)
                                return
                            }
                            this.joined.set(userId, {
                                userId,
                                userAddress: membership.userAddress,
                                miniblockNum: event.miniblockNum,
                                eventNum: event.eventNum,
                                solicitations: [],
                            })
                            this.streamMemberIdsView.addMember(this.streamId, userId)
                            break
                        case MembershipOp.SO_LEAVE:
                            this.joined.delete(userId)
                            this.streamMemberIdsView.removeMember(this.streamId, userId)
                            break
                        default:
                            break
                    }
                    this.applyMembershipEvent(userId, membership.op, 'pending', stateEmitter)
                }
                break

            case 'keySolicitation':
                {
                    const stateMember = this.joined.get(event.creatorUserId)
                    check(isDefined(stateMember), 'key solicitation from non-member')
                    this.solicitHelper.applySolicitation(
                        stateMember,
                        event.hashStr,
                        payload.content.value,
                        getEventSignature(event.remoteEvent),
                        encryptionEmitter,
                    )
                }
                break
            case 'keyFulfillment':
                {
                    const userId = userIdFromAddress(payload.content.value.userAddress)
                    const stateMember = this.joined.get(userId)
                    check(isDefined(stateMember), 'key fulfillment from non-member')
                    this.solicitHelper.applyFulfillment(
                        stateMember,
                        payload.content.value,
                        encryptionEmitter,
                    )
                }
                break
            case 'displayName':
                {
                    const stateMember = this.joined.get(event.creatorUserId)
                    check(isDefined(stateMember), 'displayName from non-member')
                    stateMember.encryptedDisplayName = create(WrappedEncryptedDataSchema, {
                        data: payload.content.value,
                    })
                    this.memberMetadata.appendDisplayName(
                        event.hashStr,
                        payload.content.value,
                        event.creatorUserId,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
                }
                break
            case 'username':
                {
                    const stateMember = this.joined.get(event.creatorUserId)
                    check(isDefined(stateMember), 'username from non-member')
                    stateMember.encryptedUsername = create(WrappedEncryptedDataSchema, {
                        data: payload.content.value,
                    })
                    this.memberMetadata.appendUsername(
                        event.hashStr,
                        payload.content.value,
                        event.creatorUserId,
                        cleartext,
                        encryptionEmitter,
                        stateEmitter,
                    )
                }
                break
            case 'ensAddress': {
                const stateMember = this.joined.get(event.creatorUserId)
                check(isDefined(stateMember), 'username from non-member')
                this.memberMetadata.appendEnsAddress(
                    event.hashStr,
                    payload.content.value,
                    event.creatorUserId,
                    stateEmitter,
                )
                break
            }
            case 'nft': {
                const stateMember = this.joined.get(event.creatorUserId)
                check(isDefined(stateMember), 'nft from non-member')
                this.memberMetadata.appendNft(
                    event.hashStr,
                    payload.content.value,
                    event.creatorUserId,
                    stateEmitter,
                )
                break
            }
            case 'pin':
                {
                    const pin = payload.content.value
                    check(isDefined(pin.event), 'invalid pin event')
                    const parsedEvent = makeParsedEvent(pin.event, pin.eventId, undefined)
                    const remoteEvent = makeRemoteTimelineEvent({ parsedEvent, eventNum: 0n })
                    this.addPin(
                        event.creatorUserId,
                        remoteEvent,
                        undefined,
                        encryptionEmitter,
                        stateEmitter,
                    )
                }
                break
            case 'unpin':
                {
                    const eventId = payload.content.value.eventId
                    this.removePin(eventId, stateEmitter)
                }
                break
            case 'memberBlockchainTransaction': {
                const transactionContent = payload.content.value.transaction?.content
                switch (transactionContent?.case) {
                    case undefined:
                        break
                    case 'tip': {
                        const tipEvent = transactionContent.value.event
                        if (!tipEvent) {
                            return
                        }
                        const currency = utils.getAddress(bin_toHexString(tipEvent.currency))
                        this.tips[currency] = (this.tips[currency] ?? 0n) + tipEvent.amount
                        this.tipsCount[currency] = (this.tipsCount[currency] ?? 0n) + 1n
                        const senderAddress = payload.content.value.fromUserAddress
                        const sender = this.joined.get(userIdFromAddress(senderAddress))
                        if (sender) {
                            sender.tipsSent = {
                                ...sender.tipsSent,
                                [currency]: (sender.tipsSent?.[currency] ?? 0n) + tipEvent.amount,
                            }
                            sender.tipsSentCount = {
                                ...sender.tipsSentCount,
                                [currency]: (sender.tipsSentCount?.[currency] ?? 0n) + 1n,
                            }
                        }
                        const receiver = this.joined.get(
                            userIdFromAddress(transactionContent.value.toUserAddress),
                        )
                        if (receiver) {
                            receiver.tipsReceived = {
                                ...receiver.tipsReceived,
                                [currency]:
                                    (receiver.tipsReceived?.[currency] ?? 0n) + tipEvent.amount,
                            }
                            receiver.tipsReceivedCount = {
                                ...receiver.tipsReceivedCount,
                                [currency]: (receiver.tipsReceivedCount?.[currency] ?? 0n) + 1n,
                            }
                        }

                        stateEmitter?.emit(
                            'streamTipped',
                            this.streamId,
                            event.hashStr,
                            transactionContent.value,
                        )
                        break
                    }
                    case 'tokenTransfer':
                        this.addTokenTransfer(
                            payload.content.value,
                            transactionContent.value,
                            event.createdAtEpochMs,
                            stateEmitter,
                        )
                        break
                    case 'spaceReview': {
                        const receipt = payload.content.value.transaction?.receipt
                        if (!receipt) {
                            return
                        }
                        if (!transactionContent.value.event) {
                            return
                        }
                        const review = getSpaceReviewEventDataBin(
                            receipt.logs,
                            transactionContent.value.event.user,
                        )
                        const existingReviewIndex = this.spaceReviews.findIndex(
                            (r) => r.review.user === review.user,
                        )
                        if (existingReviewIndex === -1) {
                            this.spaceReviews.push({
                                review: review,
                                createdAtEpochMs: event.createdAtEpochMs,
                                eventHashStr: event.hashStr,
                            })
                        } else {
                            // since we're prepending, existing reviews are newer and should be kept
                            this.spaceReviews[existingReviewIndex] = {
                                review: review,
                                createdAtEpochMs: event.createdAtEpochMs,
                                eventHashStr: event.hashStr,
                            }
                        }
                        stateEmitter?.emit('spaceReviewsUpdated', this.streamId, review)
                        break
                    }
                    default:
                        logNever(transactionContent)
                }
                break
            }
            case 'encryptionAlgorithm':
                this.encryptionAlgorithm = payload.content.value.algorithm
                stateEmitter?.emit(
                    'streamEncryptionAlgorithmUpdated',
                    this.streamId,
                    this.encryptionAlgorithm,
                )
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        _: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'memberPayload')
        const payload: MemberPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'membership':
                {
                    const eventId = event.hashStr
                    const membership = this.pendingMembershipEvents.get(eventId)
                    if (membership) {
                        this.pendingMembershipEvents.delete(eventId)
                        const userId = userIdFromAddress(membership.userAddress)
                        const streamMember = this.joined.get(userId)
                        if (streamMember) {
                            streamMember.miniblockNum = event.miniblockNum
                            streamMember.eventNum = event.eventNum
                        }
                        this.applyMembershipEvent(userId, membership.op, 'confirmed', stateEmitter)
                    }
                }
                break
            case 'keyFulfillment':
                break
            case 'keySolicitation':
                break
            case 'displayName':
            case 'username':
            case 'ensAddress':
            case 'nft':
                this.memberMetadata.onConfirmedEvent(event, stateEmitter)
                break
            case 'pin':
                break
            case 'unpin':
                break
            case 'memberBlockchainTransaction':
                break
            case 'encryptionAlgorithm':
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    onDecryptedContent(
        eventId: string,
        content: DecryptedContent,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        if (content.kind === 'text') {
            this.memberMetadata.onDecryptedContent(eventId, content.content, stateEmitter)
        }
        const pinIndex = this.pins.findIndex((pin) => pin.event.hashStr === eventId)
        if (pinIndex !== -1) {
            this.pins[pinIndex].event.decryptedContent = content
            stateEmitter?.emit('channelPinDecrypted', this.streamId, this.pins[pinIndex], pinIndex)
        }
    }

    isMemberJoined(userId: string): boolean {
        return this.joinedUsers.has(userId)
    }

    isMember(membership: MembershipOp, userId: string): boolean {
        switch (membership) {
            case MembershipOp.SO_INVITE:
                return this.invitedUsers.has(userId)
            case MembershipOp.SO_JOIN:
                return this.joinedUsers.has(userId)
            case MembershipOp.SO_LEAVE:
                return !this.invitedUsers.has(userId) && !this.joinedUsers.has(userId)
            case MembershipOp.SO_UNSPECIFIED:
                return false
            default:
                logNever(membership)
                return false
        }
    }

    participants(): Set<string> {
        return new Set([...this.joinedUsers, ...this.invitedUsers, ...this.leftUsers])
    }

    joinedParticipants(): Set<string> {
        return this.joinedUsers
    }

    joinedOrPendingJoinedParticipants(): Set<string> {
        return new Set([...this.joinedUsers, ...this.pendingJoinedUsers])
    }

    joinedOrInvitedParticipants(): Set<string> {
        return new Set([...this.joinedUsers, ...this.invitedUsers])
    }

    info(userId: string): MembershipOp {
        const isJoined = this.joinedUsers.has(userId)
        if (isJoined) return MembershipOp.SO_JOIN
        const isInvited = this.invitedUsers.has(userId)
        if (isInvited) return MembershipOp.SO_INVITE
        const hasLeft = this.leftUsers.has(userId)
        if (hasLeft) return MembershipOp.SO_LEAVE
        return MembershipOp.SO_UNSPECIFIED
    }

    private addTokenTransfer(
        payload: MemberPayload_MemberBlockchainTransaction,
        transferContent: BlockchainTransaction_TokenTransfer,
        createdAtEpochMs: bigint,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        prepend: boolean = false,
    ) {
        const receipt = payload.transaction?.receipt
        const solanaReceipt = payload.transaction?.solanaReceipt

        const transferData = {
            address: transferContent.address,
            userId: userIdFromAddress(payload.fromUserAddress),
            sender: transferContent.sender,
            chainId: receipt
                ? receipt.chainId.toString()
                : solanaReceipt
                  ? 'solana-mainnet'
                  : 'unknown chain',
            createdAtEpochMs: createdAtEpochMs,
            isBuy: transferContent.isBuy,
            messageId: bin_toHexString(transferContent.messageId),
            amount: BigInt(transferContent.amount),
        } satisfies MemberTokenTransfer
        if (prepend) {
            this.tokenTransfers.unshift(transferData)
        } else {
            this.tokenTransfers.push(transferData)
        }
        stateEmitter?.emit('streamTokenTransfer', this.streamId, transferData)
    }

    private addPin(
        creatorUserId: string,
        event: RemoteTimelineEvent,
        cleartext: Uint8Array | string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const newPin = { creatorUserId, event } satisfies Pin
        this.pins.push(newPin)
        if (
            (event.remoteEvent.event.payload.case === 'channelPayload' &&
                event.remoteEvent.event.payload.value.content.case === 'message') ||
            (event.remoteEvent.event.payload.case === 'dmChannelPayload' &&
                event.remoteEvent.event.payload.value.content.case === 'message') ||
            (event.remoteEvent.event.payload.case === 'gdmChannelPayload' &&
                event.remoteEvent.event.payload.value.content.case === 'message')
        ) {
            this.decryptEvent(
                'channelMessage',
                event,
                event.remoteEvent.event.payload.value.content.value,
                cleartext,
                encryptionEmitter,
            )
        }
        stateEmitter?.emit('channelPinAdded', this.streamId, newPin)
    }

    private removePin(
        eventId: Uint8Array,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        const eventIdStr = bin_toHexString(eventId)
        const index = this.pins.findIndex((pin) => pin.event.hashStr === eventIdStr)
        if (index !== -1) {
            const pin = this.pins.splice(index, 1)[0]
            stateEmitter?.emit('channelPinRemoved', this.streamId, pin, index)
        }
    }

    applyMembershipEvent(
        userId: string,
        op: MembershipOp,
        type: 'pending' | 'confirmed',
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        switch (op) {
            case MembershipOp.SO_INVITE:
                if (type === 'confirmed') {
                    this.pendingInvitedUsers.delete(userId)
                    if (this.invitedUsers.add(userId)) {
                        stateEmitter?.emit('streamNewUserInvited', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingInvitedUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_JOIN:
                if (type === 'confirmed') {
                    this.pendingJoinedUsers.delete(userId)
                    if (this.joinedUsers.add(userId)) {
                        stateEmitter?.emit('streamNewUserJoined', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingJoinedUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_LEAVE:
                if (type === 'confirmed') {
                    const wasJoined = this.joinedUsers.delete(userId)
                    const wasInvited = this.invitedUsers.delete(userId)
                    this.pendingLeftUsers.delete(userId)
                    this.leftUsers.add(userId)
                    if (wasJoined || wasInvited) {
                        stateEmitter?.emit('streamUserLeft', this.streamId, userId)
                        this.emitMembershipChange(userId, stateEmitter, this.streamId)
                    }
                } else {
                    if (this.pendingLeftUsers.add(userId)) {
                        stateEmitter?.emit('streamPendingMembershipUpdated', this.streamId, userId)
                    }
                }
                break
            case MembershipOp.SO_UNSPECIFIED:
                break
            default:
                logNever(op)
        }
    }

    private emitMembershipChange(
        userId: string,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
        streamId: string,
    ) {
        stateEmitter?.emit('streamMembershipUpdated', streamId, userId)
    }
}
