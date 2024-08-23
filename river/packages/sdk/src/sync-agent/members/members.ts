import { check } from '@river-build/dlog'
import { isDefined } from '../../check'
import { PersistedObservable, persistedObservable } from '../../observable/persistedObservable'
import type { Store } from '../../store/store'
import type { RiverConnection } from '../river-connection/riverConnection'
import { Member } from './models/member'
import { isUserId } from '../../id'
import { Myself } from './models/myself'

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

    protected override async onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on('streamNewUserJoined', this.onMemberJoin)
            client.on('streamNewUserInvited', this.onMemberJoin)
            client.on('streamUserLeft', this.onMemberLeave)

            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamNewUserJoined', this.onMemberJoin)
                client.off('streamNewUserInvited', this.onMemberJoin)
                client.off('streamUserLeft', this.onMemberLeave)
            }
        })
    }

    // Lazy loading the myself object, so we dont create unneeded e.g: if we're not in the stream yet
    // but we create it if we want to access it
    get myself() {
        if (this._myself) return this._myself
        this._myself = new Myself(this.data.id, this.riverConnection, this.store)
        return this._myself
    }

    get(userId: string) {
        check(isUserId(userId), 'invalid user id')
        if (userId === this.riverConnection.userId) {
            return this.myself
        }
        // Its possible to get a member that its not in the userIds array, if the user left the stream for example
        // We can get a member that left, to get the last snapshot of the member
        if (!this.members[userId]) {
            this.members[userId] = new Member(
                userId,
                this.data.id,
                this.riverConnection,
                this.store,
            )
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
        this.members = {}
        const userIds = Array.from(stream.view.getMembers().joined.values()).map(
            (member) => member.userId,
        )
        for (const userId of userIds) {
            if (userId === this.riverConnection.userId) {
                if (!this._myself) {
                    this._myself = new Myself(streamId, this.riverConnection, this.store)
                }
            } else {
                if (!this.members[userId]) {
                    this.members[userId] = new Member(
                        userId,
                        streamId,
                        this.riverConnection,
                        this.store,
                    )
                }
            }
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
    }

    private onMemberJoin = (streamId: string, userId: string): void => {
        if (streamId !== this.data.id) return
        this.setData({ userIds: [...this.data.userIds, userId] })
        if (userId === this.riverConnection.userId) {
            if (!this._myself) {
                this._myself = new Myself(streamId, this.riverConnection, this.store)
            }
        } else {
            if (!this.members[userId]) {
                this.members[userId] = new Member(
                    userId,
                    streamId,
                    this.riverConnection,
                    this.store,
                )
            }
        }
    }
}
