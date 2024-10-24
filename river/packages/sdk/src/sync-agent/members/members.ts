import { check } from '@river-build/dlog'
import { isDefined } from '../../check'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import type { Store } from '../../store/store'
import type { RiverConnection } from '../river-connection/riverConnection'
import { Member } from './models/member'
import { isUserId } from '../../id'
import { Myself } from './models/myself'
import { MembershipOp } from '@river-build/proto'

type MembersModel = {
    id: string
    userIds: string[]
    initialized: boolean
}

@persistedObservable({ tableName: 'members' })
export class Members extends PersistedObservable<MembersModel> {
    private members: Record<string, Member>
    private _myself?: Myself // better naming? me, myself, myProfile?
    constructor(streamId: string, private riverConnection: RiverConnection, store: Store) {
        super({ id: streamId, userIds: [], initialized: false }, store)
        this.members = {}
    }

    protected override onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on('streamNewUserJoined', this.onMemberJoin)
            client.on('streamNewUserInvited', this.onMemberInvite)
            client.on('streamUserLeft', this.onMemberLeave)
            client.on('streamUsernameUpdated', this.onStreamUsernameUpdated)
            client.on('streamPendingUsernameUpdated', this.onStreamUsernameUpdated)
            client.on('streamNftUpdated', this.onStreamNftUpdated)
            client.on('streamEnsAddressUpdated', this.onStreamEnsAddressUpdated)
            client.on('streamDisplayNameUpdated', this.onStreamDisplayNameUpdated)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamNewUserJoined', this.onMemberJoin)
                client.off('streamNewUserInvited', this.onMemberInvite)
                client.off('streamUserLeft', this.onMemberLeave)
                client.off('streamUsernameUpdated', this.onStreamUsernameUpdated)
                client.off('streamPendingUsernameUpdated', this.onStreamUsernameUpdated)
                client.off('streamNftUpdated', this.onStreamNftUpdated)
                client.off('streamEnsAddressUpdated', this.onStreamEnsAddressUpdated)
                client.off('streamDisplayNameUpdated', this.onStreamDisplayNameUpdated)
            }
        })
    }

    get myself() {
        if (this._myself) {
            return this._myself
        }
        const member = this.get(this.riverConnection.userId)
        const my = new Myself(member, this.data.id, this.riverConnection)
        this._myself = my
        return my
    }

    get(userId: string) {
        check(isUserId(userId), 'invalid user id')
        // Its possible to get a member that its not in the userIds array, if the user left the stream for example
        // We can get a member that left, to get the last snapshot of the member
        if (!this.members[userId]) {
            this.members[userId] = new Member(
                userId,
                this.data.id,
                this.riverConnection,
                this.store,
            )
            this.members[userId].onStreamInitialized(this.data.id)
        }
        return this.members[userId]
    }

    isUsernameAvailable(username: string): boolean {
        const streamId = this.data.id
        const streamView = this.riverConnection.client?.stream(streamId)?.view
        check(isDefined(streamView), 'stream not found')
        return streamView.getMemberMetadata().usernames.cleartextUsernameAvailable(username)
    }

    private onStreamInitialized = (streamId: string): void => {
        if (streamId !== this.data.id) return
        const stream = this.riverConnection.client?.stream(streamId)
        check(isDefined(stream), 'stream is not defined')
        const userIds = Array.from(stream.view.getMembers().joined.values()).map(
            (member) => member.userId,
        )
        for (const userId of userIds) {
            // prefetch the member
            this.get(userId)
        }
        this.setData({ initialized: true, userIds })
    }

    private onMemberLeave = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        // We dont remove the member from the members map, because we want to keep the member object around
        // so that we can still access the member's properties.
        // In the next sync, the member map will be reinitialized, cleaning up the map.
        // We remove the member from the userIds array, so that we don't try to access it later.
        this.setData({ userIds: this.data.userIds.filter((id) => id !== userId) })
        if (this.members[userId]) {
            this.members[userId].onStreamMembershipUpdated(streamId, userId, MembershipOp.SO_LEAVE)
        }
    }

    private onMemberJoin = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        this.setData({ userIds: [...this.data.userIds, userId] })
        const member = this.get(userId)
        member.onStreamMembershipUpdated(streamId, userId, MembershipOp.SO_JOIN)
    }

    private onMemberInvite = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        this.setData({ userIds: [...this.data.userIds, userId] })
        const member = this.get(userId)
        member.onStreamMembershipUpdated(streamId, userId, MembershipOp.SO_INVITE)
    }

    private onStreamUsernameUpdated = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        const member = this.get(userId)
        member.onStreamUsernameUpdated(streamId, userId)
    }

    private onStreamDisplayNameUpdated = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        const member = this.get(userId)
        member.onStreamDisplayNameUpdated(streamId, userId)
    }
    private onStreamNftUpdated = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        const member = this.get(userId)
        member.onStreamNftUpdated(streamId, userId)
    }

    private onStreamEnsAddressUpdated = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        const member = this.get(userId)
        member.onStreamEnsAddressUpdated(streamId, userId)
    }
}
