import { randProductName, randTextRange } from '@ngneat/falso'
import { GetCollectionsForOwnerResponse } from '@token-worker/types'
import { CreateSpaceFormState } from './types'

export const MOCK_CONTRACT_METADATA_RESPONSE: GetCollectionsForOwnerResponse = {
    pageKey:
        'MHgwMDcwM2Y5YjExZjJhYzAyZDM5MWExMWU3Yjk3YzZlZTgwY2Q4NTYzOjB4MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwNTpmYWxzZQ==',
    totalCount: 25434,
    collections: [
        {
            name: 'Bored Ape Nike Club',
            address: '0x000386e3f7559d9b6a2f5c46b4ad1a9587d59dc3',
            symbol: 'BANC',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/yJ9DgXqjRwgdCkrQmHj7krCbixM8fPVAyYJWJ5NHXap1L0c3QL5MPvrNT0QDINIStGOK857lOvab8MpNQS9X4pkHPktmhVmN82qoVw?w=500&auto=format',
        },
        {
            name: 'BAYC Otherside Land',
            address: '0x0015f391949f25c3211063104ad4afc99210f85c',
            symbol: 'BAYC',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/aR91WTPUmY4QBkle9qBum5dfjfCyh9n8zgYWyMAFJ-3vUUdquzasMpYyl2Jr6elxhZlPuI1gzthut99h0Z33F_k-xqev_jGldV7X?w=500&auto=format',
        },
        {
            name: 'ADIDAS X BAYC',
            address: '0x005b92d71a934dbe48e985b6469881cf4b0308fc',
            symbol: 'ADIDAS',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/DJs7QtRAItmF-ONGzar9s1McONt3fGjJMsu_CO2w82z-yLpxq-4AUHxC_HtbQagkfpnmrx55-b2YDG3GA7hpqt7QAK0M-synJHU8?w=500&auto=format',
        },
        {
            name: 'Disney X Tony Babel',
            address: '0x005d8e06cbc5e1e6040f69268504f2580cd0af40',
            symbol: 'WDXTB',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/k2Z0fklQQ2dSZKWLizo1bO8QLPg-YyT04jd17cLFniwNOyP6MG0QBx0ZfIVd2UbkF5p7o5neUMdPI9lnOw7huIuT_iT4OlVz6QwsSA?w=500&auto=format',
        },
        {
            name: 'BAYC Otherside Land',
            address: '0x006c7a91ae21afcb558cb1035148a880e5407e9e',
            symbol: 'BAYC',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/KMhJeXUfoJTp0u_j5BOGJFJ7-tAuLotYpDYrbmoUoXtt-AgrDXSchzcbfRmd-4iqNJlkMt8-5wYVSpKRQwpSC3eYWqSTJYuflS9Vuw?w=500&auto=format',
        },
        {
            name: 'Elon Musk',
            address: '0x00703f9b11f2ac02d391a11e7b97c6ee80cd8563',
            symbol: 'MUSK',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gae/7O8H5tVTUPfi03LBY3xI29wkuzp8sSsRvr_BjOxXUfsU7mrkV7WxhOMedXKBp-dqDtCLjSfLwzWEMg6_yrxw8YPXC7OY9TqelDm9?w=500&auto=format',
        },
    ],
}

export const MOCK_TOKENS = Array(5)
    .fill(0)
    .map((_, index) => {
        return {
            imgSrc: `https://picsum.photos/id/${index + 20}/400`,
            label: randTextRange({
                min: 5,
                max: 10,
            }),
            contractAddress: `0x71C7656EC7ab88b098defB751B7401B5f6d8976${index + 1}`,
        }
    })

export const StoreMockForManualSubmissionsNotToBeUsedInTests: CreateSpaceFormState = {
    step1: {
        membershipType: 'tokenHolders',
        // just for easier development, this is the zion token address from council.json, which may change so check it sometimes
        tokens: [{ contractAddress: '0x9a676e781a523b5d0c0e43731313a708cb607508', tokenIds: [] }],
    },
    step2: {
        spaceName: randProductName().toLowerCase(),
    },
    spaceImageData: null,
    createdSpaceId: null,
    mintedTokenAddress: null,
}
