import TypedEmitter from 'typed-emitter'
import { MemberPayload_KeyFulfillment, MemberPayload_KeySolicitation } from '@towns-protocol/proto'
import { StreamEncryptionEvents } from './streamEvents'
import { StreamMember } from './streamStateView_Members'
import { removeCommon } from './utils'
import { EventSignatureBundle, KeySolicitationContent } from './decryptionExtensions'
import { check } from '@towns-protocol/dlog'
import { isDefined } from './check'

export class StreamStateView_Members_Solicitations {
    snapshotSigBundle?: EventSignatureBundle
    snapshotEventId?: string

    constructor(readonly streamId: string) {}

    initSolicitations(
        eventHashStr: string,
        members: StreamMember[],
        sigBundle: EventSignatureBundle,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        this.snapshotSigBundle = sigBundle
        this.snapshotEventId = eventHashStr
        encryptionEmitter?.emit(
            'initKeySolicitations',
            this.streamId,
            eventHashStr,
            members.map((member) => ({
                userId: member.userId,
                userAddress: member.userAddress,
                solicitations: member.solicitations,
            })),
            sigBundle,
        )
    }

    applySolicitation(
        user: StreamMember,
        eventId: string,
        solicitation: MemberPayload_KeySolicitation,
        sigBundle: EventSignatureBundle,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        user.solicitations = user.solicitations.filter(
            (x) => x.deviceKey !== solicitation.deviceKey,
        )
        const newSolicitation = {
            deviceKey: solicitation.deviceKey,
            fallbackKey: solicitation.fallbackKey,
            isNewDevice: solicitation.isNewDevice,
            sessionIds: solicitation.sessionIds.toSorted(),
        } satisfies KeySolicitationContent
        user.solicitations.push(newSolicitation)
        encryptionEmitter?.emit(
            'newKeySolicitation',
            this.streamId,
            eventId,
            user.userId,
            user.userAddress,
            newSolicitation,
            sigBundle,
        )
    }

    applyFulfillment(
        user: StreamMember,
        fulfillment: MemberPayload_KeyFulfillment,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        check(isDefined(this.snapshotSigBundle), 'snapshotSigBundle not set')
        check(isDefined(this.snapshotEventId), 'snapshotEventId not set')
        const index = user.solicitations.findIndex((x) => x.deviceKey === fulfillment.deviceKey)
        if (index === undefined || index === -1) {
            return
        }
        const prev = user.solicitations[index]
        const newEvent = {
            deviceKey: prev.deviceKey,
            fallbackKey: prev.fallbackKey,
            isNewDevice: false,
            sessionIds: [...removeCommon(prev.sessionIds, fulfillment.sessionIds.toSorted())],
        } satisfies KeySolicitationContent
        user.solicitations[index] = newEvent
        encryptionEmitter?.emit(
            'updatedKeySolicitation',
            this.streamId,
            this.snapshotEventId,
            user.userId,
            user.userAddress,
            newEvent,
            this.snapshotSigBundle,
        )
    }
}
