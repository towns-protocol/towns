import { bin_toHexString, bin_toString, check } from '@river-build/dlog'
import { isDefined } from '../../../check'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import type { Store } from '../../../store/store'
import type { RiverConnection } from '../../river-connection/riverConnection'
import { MembershipOp } from '@river-build/proto'
import type { Address } from '@river-build/web3'

export type MemberModel = {
    id: string
    userId: string
    streamId: string
    initialized: boolean
    // username
    username: string
    isUsernameConfirmed: boolean
    isUsernameEncrypted: boolean
    // displayName
    displayName: string
    isDisplayNameEncrypted?: boolean
    // ensAddress
    ensAddress?: string
    // nft
    nft?: NftModel
    // membership
    membership?: MembershipOp
}

export type NftModel = {
    contractAddress: string
    tokenId: string
    chainId: number
}

@persistedObservable({ tableName: 'member' })
export class Member extends PersistedObservable<MemberModel> {
    constructor(
        private userId: string,
        streamId: string,
        protected riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            {
                id: `${userId}_${streamId}`,
                userId,
                streamId,
                initialized: false,
                username: '',
                isUsernameConfirmed: false,
                isUsernameEncrypted: false,
                displayName: '',
                isDisplayNameEncrypted: false,
                ensAddress: undefined,
                nft: undefined,
                membership: undefined,
            },
            store,
        )
    }

    onStreamInitialized(streamId: string) {
        if (this.data.streamId === streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const metadata = streamView.getMemberMetadata()
            const usernameInfo = metadata?.usernames.info(this.userId)
            const displayNameInfo = metadata?.displayNames.info(this.userId)
            const ensAddress = metadata?.ensAddresses.info(this.userId)
            const nft = metadata?.nfts.info(this.userId)
            const membership = streamView.getMembers().membership.info(this.userId)

            this.setData({
                initialized: true,
                username: usernameInfo?.username,
                isUsernameConfirmed: usernameInfo?.usernameConfirmed,
                isUsernameEncrypted: usernameInfo?.usernameEncrypted,
                displayName: displayNameInfo?.displayName,
                isDisplayNameEncrypted: displayNameInfo?.displayNameEncrypted,
                ensAddress,
                nft,
                membership,
            })
        }
    }

    onStreamUsernameUpdated(streamId: string, userId: string) {
        if (this.data.userId === userId && this.data.streamId === streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const usernameInfo = streamView.getMemberMetadata()?.usernames.info(this.userId)
            this.setData({
                username: usernameInfo?.username,
                isUsernameConfirmed: usernameInfo?.usernameConfirmed,
                isUsernameEncrypted: usernameInfo?.usernameEncrypted,
            })
        }
    }

    public onStreamNftUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            const streamView = this.riverConnection.client?.stream(streamId)?.view
            const metadata = streamView?.getMemberMetadata()
            if (metadata) {
                const nftPayload = metadata.nfts.confirmedNfts.get(userId)
                const nft = nftPayload
                    ? {
                          contractAddress: bin_toHexString(nftPayload.contractAddress),
                          tokenId: bin_toString(nftPayload.tokenId),
                          chainId: nftPayload.chainId,
                      }
                    : undefined
                this.setData({ nft })
            }
        }
    }

    public onStreamEnsAddressUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            const stream = this.riverConnection.client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()
            const ensAddress = metadata?.ensAddresses.info(userId)
            if (ensAddress) {
                this.setData({ ensAddress: ensAddress as Address })
            }
        }
    }

    public onStreamDisplayNameUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            const stream = this.riverConnection.client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()
            const info = metadata?.displayNames.info(userId)
            if (info) {
                this.setData({
                    displayName: info.displayName,
                    isDisplayNameEncrypted: info.displayNameEncrypted,
                })
            }
        }
    }

    public onStreamMembershipUpdated = (
        streamId: string,
        userId: string,
        membership: MembershipOp,
    ) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            this.setData({ membership })
        }
    }

    get username() {
        return this.data.username
    }

    get displayName() {
        return this.data.displayName
    }

    get ensAddress() {
        return this.data.ensAddress
    }

    get nft() {
        return this.data.nft
    }

    get membership() {
        return this.data.membership
    }
}
