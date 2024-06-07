import TypedEmitter from 'typed-emitter'
import { MemberPayload_Nft } from '@river-build/proto'
import { StreamStateEvents } from './streamEvents'
import { bin_toString, dlog } from '@river-build/dlog'
import { userIdFromAddress } from './id'

export class userMetadata_Nft {
    log = dlog('csb:streams:Nft')
    readonly streamId: string
    readonly userIdToEventId = new Map<string, string>()
    readonly confirmedNfts = new Map<string, MemberPayload_Nft>()
    readonly nftEvents = new Map<
        string,
        { nft: MemberPayload_Nft; userId: string; pending: boolean }
    >()

    constructor(streamId: string) {
        this.streamId = streamId
    }

    applySnapshot(nfts: { userId: string; nft: MemberPayload_Nft }[]) {
        for (const item of nfts) {
            if (this.isValidNft(item.nft)) {
                this.confirmedNfts.set(item.userId, item.nft)
            }
        }
    }

    addNftEvent(
        eventId: string,
        nft: MemberPayload_Nft,
        userId: string,
        pending: boolean,
        stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ) {
        this.removeEventForUserId(userId)
        if (!pending) {
            if (this.isValidNft(nft)) {
                this.confirmedNfts.set(userId, nft)
            } else {
                this.confirmedNfts.delete(userId)
            }
        }
        this.addEventForUserId(userId, eventId, nft, pending)
        this.emitNftUpdated(eventId, stateEmitter)
    }

    private removeEventForUserId(userId: string) {
        // remove any traces of old events for this user
        const eventId = this.userIdToEventId.get(userId)
        if (!eventId) {
            this.log(`no existing ens event for user ${userId}`)
            return
        }

        const event = this.nftEvents.get(eventId)
        if (!event) {
            this.log(`no existing event for user ${userId} — this is a programmer error`)
            return
        }
        this.nftEvents.delete(eventId)
        this.log(`deleted old event for user ${userId}`)
    }

    onConfirmEvent(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.nftEvents.get(eventId)
        if (!event) {
            return
        }
        this.nftEvents.set(eventId, { ...event, pending: false })

        if (this.isValidNft(event.nft)) {
            this.confirmedNfts.set(event.userId, event.nft)
        } else {
            this.confirmedNfts.delete(event.userId)
        }

        this.emitNftUpdated(eventId, emitter)
    }

    private addEventForUserId(
        userId: string,
        eventId: string,
        nft: MemberPayload_Nft,
        pending: boolean,
    ) {
        // add to the userId -> eventId mapping for fast lookup later
        this.userIdToEventId.set(userId, eventId)
        this.nftEvents.set(eventId, {
            userId,
            nft: nft,
            pending: pending,
        })
    }

    private emitNftUpdated(eventId: string, emitter?: TypedEmitter<StreamStateEvents>) {
        const event = this.nftEvents.get(eventId)
        if (!event) {
            return
        }
        if (event.pending) {
            return
        }
        emitter?.emit('streamNftUpdated', this.streamId, event.userId)
    }

    info(userId: string):
        | {
              tokenId: string
              contractAddress: string
              chainId: number
          }
        | undefined {
        const nft = this.confirmedNfts.get(userId)
        if (!nft) {
            return undefined
        }
        return {
            tokenId: bin_toString(nft.tokenId),
            contractAddress: userIdFromAddress(nft.contractAddress),
            chainId: nft.chainId,
        }
    }

    isValidNft(nft: MemberPayload_Nft): boolean {
        return nft.tokenId.length > 0 && nft.contractAddress.length > 0 && nft.chainId > 0
    }
}
