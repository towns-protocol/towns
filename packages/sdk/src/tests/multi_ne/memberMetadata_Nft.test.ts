/**
 * @group main
 */

import { MemberPayload_NftSchema } from '@towns-protocol/proto'
import { MemberMetadata_Nft } from '../../memberMetadata_Nft'
import { makeRandomUserAddress } from '../testUtils'
import { bin_fromString } from '@towns-protocol/utils'
import { create } from '@bufbuild/protobuf'

describe('memberMetadata_NftTests', () => {
    const streamId = 'streamid1'
    let nfts: MemberMetadata_Nft
    beforeEach(() => {
        nfts = new MemberMetadata_Nft(streamId)
    })

    test('clientCanSetNft', async () => {
        const tokenId = bin_fromString('11111111122222222223333333333')
        const nft = create(MemberPayload_NftSchema, {
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
        const nft = create(MemberPayload_NftSchema, {
            chainId: 1,
            contractAddress: makeRandomUserAddress(),
            tokenId: tokenId,
        })

        nfts.addNftEvent('event-id-1', nft, 'userid-1', true, undefined)
        nfts.onConfirmEvent('event-id-1')
        // event confirmed, now it exists in the map
        expect(nfts.confirmedNfts).toEqual(new Map([['userid-1', nft]]))

        const clearNft = create(MemberPayload_NftSchema, {})
        nfts.addNftEvent('event-id-2', clearNft, 'userid-1', true, undefined)
        nfts.onConfirmEvent('event-id-2')
        // clear event confirmed, map should be empty
        expect(nfts.confirmedNfts).toEqual(new Map([]))
    })
})
