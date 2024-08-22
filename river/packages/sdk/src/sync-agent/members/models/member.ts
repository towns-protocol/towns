import type { Store } from '../../../store/store'
import type { RiverConnection } from '../../river-connection/riverConnection'
import { MemberMembership } from './membership'
import { MemberDisplayName } from './metadata/displayName'
import { MemberEnsAddress } from './metadata/ensAddress'
import { MemberNft } from './metadata/nft'
import { MemberUsername } from './metadata/username'

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
