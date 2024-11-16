import { bin_toHexString, bin_toString, check } from '@river-build/dlog'
import { isDefined } from '../../../check'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import type { Store } from '../../../store/store'
import type { RiverConnection } from '../../river-connection/riverConnection'
import { MembershipOp } from '@river-build/proto'
import type { Address } from '@river-build/web3'

export type MemberModel = {
    /**
     * The store id of the member.
     * @internal
     */
    id: string
    /** The id of the user. */
    userId: string
    /** The id of the stream where the data belongs to. */
    streamId: string
    /** Whether the SyncAgent has loaded this data. */
    initialized: boolean
    /** Username of the member. */
    username: string
    /** Whether the username has been confirmed by the River node. */
    isUsernameConfirmed: boolean
    /** Whether the username is encrypted. */
    isUsernameEncrypted: boolean
    /** Display name of the member. */
    displayName: string
    /** Whether the display name is encrypted. */
    isDisplayNameEncrypted?: boolean
    /**
     * ENS address of the member.
     * Should not be trusted, as it can be spoofed.
     * You should be validating it.
     */
    ensAddress?: string
    /**
     * {@link NftModel} of the member.
     * Should not be trusted, as it can be spoofed.
     * You should be validating it.
     */
    nft?: NftModel
    /** {@link MembershipOp} of the member. */
    membership?: MembershipOp
}

export type NftModel = {
    /** The contract address of the NFT. */
    contractAddress: string
    /** The token id of the NFT. */
    tokenId: string
    /** The chain id of the NFT. */
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
