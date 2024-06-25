import { MembershipOp, UserPayload_UserMembership } from '@river-build/proto'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { LoadPriority, Store } from '../../../store/store'
import { check, dlogger } from '@river-build/dlog'
import { RiverConnection } from '../../river-connection/riverConnection'
import { Client } from '../../../client'
import { makeUserStreamId, streamIdFromBytes, userIdFromAddress } from '../../../id'
import { StreamStateView } from '../../../streamStateView'
import { isDefined } from '../../../check'

const logger = dlogger('csb:userMemberships')

export interface UserMembership {
    streamId: string
    op: MembershipOp
    inviter?: string
    streamParentId?: string
}

export interface UserMembershipsModel {
    id: string
    initialized: boolean
    memberships: Record<string, UserMembership>
}

export type UserMembershipEvents = {
    userJoinedStream: (streamId: string) => void
    userInvitedToStream: (streamId: string) => void
    userLeftStream: (streamId: string) => void
    userStreamMembershipChanged: (streamId: string) => void
}

@persistedObservable({ tableName: 'userMemberships' })
export class UserMemberships extends PersistedObservable<UserMembershipsModel> {
    private riverConnection: RiverConnection
    private streamId: string

    constructor(id: string, store: Store, riverConnection: RiverConnection) {
        super({ id, initialized: false, memberships: {} }, store, LoadPriority.high)
        this.riverConnection = riverConnection
        this.streamId = makeUserStreamId(id)
    }

    override async onLoaded() {
        this.riverConnection.registerView(this)
    }

    onClientStarted(client: Client) {
        logger.log('onClientStarted')
        const streamView = this.riverConnection.client.value?.stream(this.streamId)?.view
        if (streamView) {
            this.initialize(streamView)
        }
        client.addListener('userStreamMembershipChanged', this.onUserStreamMembershipChanged)
        client.addListener('streamInitialized', this.onStreamInitialized)
        return () => {
            client.removeListener('userStreamMembershipChanged', this.onUserStreamMembershipChanged)
            client.removeListener('streamInitialized', this.onStreamInitialized)
        }
    }

    getMembership(streamId: string): UserMembership | undefined {
        return this.data.memberships[streamId]
    }

    isMember(streamId: string, membership: MembershipOp): boolean {
        return this.getMembership(streamId)?.op === membership
    }

    isJoined(streamId: string): boolean {
        return this.isMember(streamId, MembershipOp.SO_JOIN)
    }

    private initialize = (streamView: StreamStateView) => {
        const memberships = Object.entries(streamView.userContent.streamMemberships).reduce(
            (acc, [streamId, payload]) => {
                acc[streamId] = toUserMembership(payload)
                return acc
            },
            {} as Record<string, UserMembership>,
        )
        this.update({ ...this.data, memberships, initialized: true })
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.streamId) {
            const streamView = this.riverConnection.client.value?.stream(this.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            this.initialize(streamView)
        }
    }

    private onUserStreamMembershipChanged = (
        streamId: string,
        payload: UserPayload_UserMembership,
    ) => {
        this.update({
            ...this.data,
            memberships: {
                ...this.data.memberships,
                [streamId]: toUserMembership(payload),
            },
        })
    }
}

function toUserMembership(payload: UserPayload_UserMembership): UserMembership {
    const { op, streamId: inStreamId } = payload
    const streamId = streamIdFromBytes(inStreamId)
    return {
        streamId,
        op,
        inviter: payload.inviter ? userIdFromAddress(payload.inviter) : undefined,
        streamParentId: payload.streamParentId
            ? streamIdFromBytes(payload.streamParentId)
            : undefined,
    } satisfies UserMembership
}
