import type { Store } from '../../../store/store'
import type { RiverConnection } from '../../river-connection/riverConnection'
import { MemberMembership } from './membership'
import { MemberDisplayName } from './metadata/displayName'
import { MemberEnsAddress } from './metadata/ensAddress'
import { MemberNft } from './metadata/nft'
import { MemberUsername } from './metadata/username'
import { MembershipOp } from '@river-build/proto'

export class Member {
    observables: {
        username: MemberUsername
        displayName: MemberDisplayName
        ensAddress: MemberEnsAddress
        nft: MemberNft
        membership: MemberMembership
    }
    constructor(
        userId: string,
        streamId: string,
        protected riverConnection: RiverConnection,
        store: Store,
    ) {
        this.observables = {
            username: new MemberUsername(userId, streamId, this.riverConnection, store),
            displayName: new MemberDisplayName(userId, streamId, this.riverConnection, store),
            ensAddress: new MemberEnsAddress(userId, streamId, this.riverConnection, store),
            nft: new MemberNft(userId, streamId, this.riverConnection, store),
            membership: new MemberMembership(userId, streamId, this.riverConnection, store),
        }
    }

    onStreamInitialized(streamId: string) {
        for (const model of Object.values(this.observables)) {
            model.onStreamInitialized(streamId)
        }
    }

    onUsernameUpdated(streamId: string, userId: string) {
        this.observables.username.onStreamUsernameUpdated(streamId, userId)
    }

    onDisplayNameUpdated(streamId: string, userId: string) {
        this.observables.displayName.onStreamDisplayNameUpdated(streamId, userId)
    }

    onEnsAddressUpdated(streamId: string, userId: string) {
        this.observables.ensAddress.onStreamEnsAddressUpdated(streamId, userId)
    }

    onNftUpdated(streamId: string, userId: string) {
        this.observables.nft.onStreamNftUpdated(streamId, userId)
    }

    onMembershipUpdated(streamId: string, userId: string, op: MembershipOp) {
        this.observables.membership.onStreamMembershipUpdated(streamId, userId, op)
    }

    get username() {
        return this.observables.username.data.username
    }

    get displayName() {
        return this.observables.displayName.data.displayName
    }

    get ensAddress() {
        return this.observables.ensAddress.data.ensAddress
    }

    get nft() {
        return this.observables.nft.data.nft
    }

    get membership() {
        return this.observables.membership.data.op
    }
}
