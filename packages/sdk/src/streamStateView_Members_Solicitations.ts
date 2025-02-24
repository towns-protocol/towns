import TypedEmitter from 'typed-emitter'
import { MemberPayload_KeyFulfillment, MemberPayload_KeySolicitation } from '@river-build/proto'
import { StreamEncryptionEvents } from './streamEvents'
import { StreamMember } from './streamStateView_Members'
import { removeCommon } from './utils'
import { EventSignatureBundle, KeySolicitationContent } from '@river-build/encryption'

export class StreamStateView_Members_Solicitations {
    constructor(readonly streamId: string) {}

    initSolicitations(
        members: StreamMember[],
        sigBundle: EventSignatureBundle,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        encryptionEmitter?.emit(
            'initKeySolicitations',
            this.streamId,
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
            srcEventId: eventId,
        } satisfies KeySolicitationContent
        user.solicitations.push(newSolicitation)
        encryptionEmitter?.emit(
            'newKeySolicitation',
            this.streamId,
            user.userId,
            user.userAddress,
            newSolicitation,
            sigBundle,
        )
    }

    applyFulfillment(
        user: StreamMember,
        fulfillment: MemberPayload_KeyFulfillment,
        sigBundle: EventSignatureBundle,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
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
            srcEventId: prev.srcEventId,
        } satisfies KeySolicitationContent
        user.solicitations[index] = newEvent
        encryptionEmitter?.emit(
            'updatedKeySolicitation',
            this.streamId,
            user.userId,
            user.userAddress,
            newEvent,
            sigBundle,
        )
    }
}
