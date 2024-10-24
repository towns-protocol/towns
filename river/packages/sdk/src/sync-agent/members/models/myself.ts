import type { Address } from '@river-build/web3'
import type { RiverConnection } from '../../river-connection/riverConnection'
import { addressFromUserId } from '../../../id'
import { Member, type NftModel } from './member'

export class Myself {
    constructor(
        public member: Member,
        protected streamId: string,
        protected riverConnection: RiverConnection,
    ) {}

    get username() {
        return this.member.username
    }

    get displayName() {
        return this.member.displayName
    }

    get ensAddress() {
        return this.member.ensAddress
    }

    get nft() {
        return this.member.nft
    }

    get membership() {
        return this.member.membership
    }

    async setUsername(username: string) {
        const streamId = this.streamId
        const oldData = {
            username: this.member.data.username,
            isUsernameConfirmed: this.member.data.isUsernameConfirmed,
            isUsernameEncrypted: this.member.data.isUsernameEncrypted,
        }
        this.member.setData({ username, isUsernameConfirmed: true, isUsernameEncrypted: false })
        return this.riverConnection
            .withStream(streamId)
            .call((client) => client.setUsername(streamId, username))
            .catch((e) => {
                this.member.setData(oldData)
                throw e
            })
    }

    async setDisplayName(displayName: string) {
        const streamId = this.streamId
        const oldData = {
            displayName: this.member.data.displayName,
            isDisplayNameEncrypted: this.member.data.isDisplayNameEncrypted,
        }
        this.member.setData({ displayName, isDisplayNameEncrypted: false })
        return this.riverConnection
            .withStream(streamId)
            .call((client) => client.setDisplayName(streamId, displayName))
            .catch((e) => {
                this.member.setData(oldData)
                throw e
            })
    }

    async setEnsAddress(ensAddress: Address) {
        const streamId = this.streamId
        const oldData = {
            ensAddress: this.member.data.ensAddress,
        }
        this.member.setData({ ensAddress })
        const bytes = addressFromUserId(ensAddress as string)
        return this.riverConnection
            .withStream(streamId)
            .call((client) => client.setEnsAddress(streamId, bytes))
            .catch((e) => {
                this.member.setData(oldData)
                throw e
            })
    }

    async setNft(nft: NftModel) {
        const streamId = this.streamId
        const oldData = {
            nft: this.member.data.nft,
        }
        const { contractAddress, tokenId, chainId } = nft
        this.member.setData({
            nft: {
                contractAddress,
                tokenId,
                chainId,
            },
        })
        return this.riverConnection
            .withStream(streamId)
            .call((client) =>
                client.setNft(streamId, nft.tokenId, nft.chainId, nft.contractAddress),
            )
            .catch((e) => {
                this.member.setData(oldData)
                throw e
            })
    }
}
