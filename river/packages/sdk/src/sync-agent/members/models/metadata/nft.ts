import { bin_toHexString, bin_toString, check } from '@river-build/dlog'
import { LoadPriority, type Identifiable, type Store } from '../../../../store/store'
import {
    PersistedObservable,
    persistedObservable,
} from '../../../../observable/persistedObservable'
import type { RiverConnection } from '../../../river-connection/riverConnection'
import { isDefined } from '../../../../check'

export type NftModel = {
    contractAddress: string
    tokenId: string
    chainId: number
}

export interface MemberNftModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
    nft?: NftModel
}

@persistedObservable({ tableName: 'member_nft' })
export class MemberNft extends PersistedObservable<MemberNftModel> {
    constructor(
        userId: string,
        streamId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            { id: `${userId}_${streamId}`, streamId, initialized: false },
            store,
            LoadPriority.high,
        )
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

            client.on('streamNftUpdated', this.onStreamNftUpdated)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamNftUpdated', this.onStreamNftUpdated)
            }
        })
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const metadata = streamView.getMemberMetadata()
            const nft = metadata?.nfts.confirmedNfts.get(this.data.id)
            this.setData({
                initialized: true,
                nft: nft
                    ? {
                          contractAddress: bin_toHexString(nft.contractAddress),
                          tokenId: bin_toString(nft.tokenId),
                          chainId: nft.chainId,
                      }
                    : undefined,
            })
        }
    }

    private onStreamNftUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.data.id) {
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
}
