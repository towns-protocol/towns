import {
    MembershipOp,
    MemberPayload,
    Snapshot,
    WrappedEncryptedData,
    MemberPayload_Nft,
} from '@river-build/proto'
import TypedEmitter from 'typed-emitter'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { ConfirmedTimelineEvent, RemoteTimelineEvent } from './types'
import { isDefined, logNever } from './check'
import { userIdFromAddress } from './id'
import { StreamStateView_Members_Membership } from './streamStateView_Members_Membership'
import { StreamStateView_Members_Solicitations } from './streamStateView_Members_Solicitations'
import { check } from '@river-build/dlog'
import { DecryptedContent } from './encryptedContentTypes'
import { StreamStateView_UserMetadata } from './streamStateView_UserMetadata'
import { KeySolicitationContent } from '@river-build/encryption'

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
}

export class StreamStateView_Members {
    readonly streamId: string
    readonly joined = new Map<string, StreamMember>()
    readonly membership: StreamStateView_Members_Membership
    readonly solicitHelper: StreamStateView_Members_Solicitations
    readonly userMetadata: StreamStateView_UserMetadata

    constructor(streamId: string) {
        this.streamId = streamId
        this.membership = new StreamStateView_Members_Membership(streamId)
        this.solicitHelper = new StreamStateView_Members_Solicitations(streamId)
        this.userMetadata = new StreamStateView_UserMetadata(streamId)
    }

    // initialization
    applySnapshot(
        snapshot: Snapshot,
        cleartexts: Record<string, string> | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        if (!snapshot.members) {
            return
        }
        for (const member of snapshot.members.joined) {
            const userId = userIdFromAddress(member.userAddress)
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
                        } satisfies KeySolicitationContent),
                ),
                encryptedUsername: member.username,
                encryptedDisplayName: member.displayName,
                ensAddress: member.ensAddress,
                nft: member.nft,
            })
            this.membership.applyMembershipEvent(
                userId,
                MembershipOp.SO_JOIN,
                'confirmed',
                undefined,
            )
        }
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

        this.userMetadata.applySnapshot(
            usernames,
            displayNames,
            ensAddresses,
            nfts,
            cleartexts,
            encryptionEmitter,
        )
        this.solicitHelper.initSolicitations(Array.from(this.joined.values()), encryptionEmitter)
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _payload: MemberPayload,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // noop, everything relevant was in the snapshot
    }

    /**
     * Places event in a pending queue, to be applied when the event is confirmed in a miniblock header
     */
    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        payload: MemberPayload,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'membership':
                {
                    const membership = payload.content.value
                    this.membership.pendingMembershipEvents.set(event.hashStr, membership)
                    const userId = userIdFromAddress(membership.userAddress)
                    switch (membership.op) {
                        case MembershipOp.SO_JOIN:
                            check(!this.joined.has(userId), 'user already joined')
                            this.joined.set(userId, {
                                userId,
                                userAddress: membership.userAddress,
                                miniblockNum: event.miniblockNum,
                                eventNum: event.eventNum,
                                solicitations: [],
                            })
                            break
                        case MembershipOp.SO_LEAVE:
                            this.joined.delete(userId)
                            break
                        default:
                            break
                    }
                    this.membership.applyMembershipEvent(
                        userId,
                        membership.op,
                        'pending',
                        stateEmitter,
                    )
                }
                break

            case 'keySolicitation':
                {
                    const stateMember = this.joined.get(event.creatorUserId)
                    check(isDefined(stateMember), 'key solicitation from non-member')
                    this.solicitHelper.applySolicitation(
                        stateMember,
                        payload.content.value,
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
                    stateMember.encryptedDisplayName = new WrappedEncryptedData({
                        data: payload.content.value,
                    })
                    this.userMetadata.appendDisplayName(
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
                    stateMember.encryptedUsername = new WrappedEncryptedData({
                        data: payload.content.value,
                    })
                    this.userMetadata.appendUsername(
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
                this.userMetadata.appendEnsAddress(
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
                this.userMetadata.appendNft(
                    event.hashStr,
                    payload.content.value,
                    event.creatorUserId,
                    stateEmitter,
                )
                break
            }
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    onConfirmedEvent(
        event: ConfirmedTimelineEvent,
        payload: MemberPayload,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'membership':
                {
                    const eventId = event.hashStr
                    const membership = this.membership.pendingMembershipEvents.get(eventId)
                    if (membership) {
                        this.membership.pendingMembershipEvents.delete(eventId)
                        const userId = userIdFromAddress(membership.userAddress)
                        const streamMember = this.joined.get(userId)
                        if (streamMember) {
                            streamMember.miniblockNum = event.miniblockNum
                            streamMember.eventNum = event.eventNum
                        }
                        this.membership.applyMembershipEvent(
                            userId,
                            membership.op,
                            'confirmed',
                            stateEmitter,
                        )
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
                this.userMetadata.onConfirmedEvent(event, stateEmitter)
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
            this.userMetadata.onDecryptedContent(eventId, content.content, stateEmitter)
        }
    }

    isMemberJoined(userId: string): boolean {
        return this.membership.joinedUsers.has(userId)
    }

    isMember(membership: MembershipOp, userId: string): boolean {
        return this.membership.isMember(membership, userId)
    }

    participants(): Set<string> {
        return this.membership.participants()
    }

    joinedParticipants(): Set<string> {
        return this.membership.joinedParticipants()
    }

    joinedOrInvitedParticipants(): Set<string> {
        return this.membership.joinedOrInvitedParticipants()
    }
}
