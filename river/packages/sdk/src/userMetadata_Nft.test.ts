/**
 * @group main
 */

import { MemberPayload_Nft } from '@river-build/proto'
import { userMetadata_Nft } from './userMetadata_Nft'
import { makeRandomUserAddress } from './util.test'
import { bin_fromString } from '@river-build/dlog'

describe('userMetadata_NftTests', () => {
    const streamId = 'streamid1'
    let nfts: userMetadata_Nft
    beforeEach(() => {
        nfts = new userMetadata_Nft(streamId)
    })

    test('clientCanSetNft', async () => {
        const tokenId = bin_fromString('11111111122222222223333333333')
        const nft = new MemberPayload_Nft({
            chainId: 1,
            contractAddress: makeRandomUserAddress(),
            tokenId: tokenId,
        })
        nfts.addNftEvent('event-id-1', nft, 'userid-1', true, undefined)

        // the plaintext map is empty until the event is no longer pending
        expect(nfts.confirmedNfts).toEqual(new Map([]))
        nfts.onConfirmEvent('event-id-1')
        // event confirmed, now it exists in the map
        expect(nfts.confirmedNfts).toEqual(new Map([['userid-1', nft]]))

        const info = nfts.info('userid-1')!
        expect(info.tokenId).toEqual('11111111122222222223333333333')
    })

    test('clientCanClearNft', async () => {
        const tokenId = bin_fromString('11111111122222222223333333333')
        const nft = new MemberPayload_Nft({
            chainId: 1,
            contractAddress: makeRandomUserAddress(),
            tokenId: tokenId,
        })

        nfts.addNftEvent('event-id-1', nft, 'userid-1', true, undefined)
        nfts.onConfirmEvent('event-id-1')
        // event confirmed, now it exists in the map
        expect(nfts.confirmedNfts).toEqual(new Map([['userid-1', nft]]))

        const clearNft = new MemberPayload_Nft()
        nfts.addNftEvent('event-id-2', clearNft, 'userid-1', true, undefined)
        nfts.onConfirmEvent('event-id-2')
        // clear event confirmed, map should be empty
        expect(nfts.confirmedNfts).toEqual(new Map([]))
    })
})
