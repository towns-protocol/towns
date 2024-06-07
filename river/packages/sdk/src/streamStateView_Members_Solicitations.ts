import TypedEmitter from 'typed-emitter'
import { MemberPayload_KeyFulfillment, MemberPayload_KeySolicitation } from '@river-build/proto'
import { StreamEncryptionEvents } from './streamEvents'
import { StreamMember } from './streamStateView_Members'
import { removeCommon } from './utils'

export class StreamStateView_Members_Solicitations {
    constructor(readonly streamId: string) {}

    initSolicitations(
        members: StreamMember[],
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        for (const member of members) {
            for (const event of member.solicitations) {
                encryptionEmitter?.emit(
                    'newKeySolicitation',
                    this.streamId,
                    member.userId,
                    member.userAddress,
                    event,
                )
            }
        }
    }

    applySolicitation(
        user: StreamMember,
        solicitation: MemberPayload_KeySolicitation,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        user.solicitations = user.solicitations.filter(
            (x) => x.deviceKey !== solicitation.deviceKey,
        )
        user.solicitations.push({
            deviceKey: solicitation.deviceKey,
            fallbackKey: solicitation.fallbackKey,
            isNewDevice: solicitation.isNewDevice,
            sessionIds: [...solicitation.sessionIds.sort()],
        })

        encryptionEmitter?.emit(
            'newKeySolicitation',
            this.streamId,
            user.userId,
            user.userAddress,
            solicitation,
        )
    }

    applyFulfillment(
        user: StreamMember,
        fulfillment: MemberPayload_KeyFulfillment,
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
            sessionIds: [...removeCommon(prev.sessionIds, fulfillment.sessionIds.sort())],
        }
        user.solicitations[index] = newEvent
        encryptionEmitter?.emit(
            'updatedKeySolicitation',
            this.streamId,
            user.userId,
            user.userAddress,
            newEvent,
        )
    }
}
