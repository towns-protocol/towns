import {
    GetCollectionMetadataInfuraResponse,
    GetContractMetadataAlchemyResponse,
    ContractMetadata,
} from '../src/types'

export const getNftsMock = {
    pageKey: 'b',
    totalCount: 4,
    blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ownedNfts: [
        {
            contract: {
                address: '0x047fb9f175f796cdc34f92624492d73df58370e1',
            },
            id: {
                tokenId: '0x01',
                tokenMetadata: {
                    tokenType: 'ERC1155',
                },
            },
            balance: '1',
            title: 'DaoDon Founders Card',
            description:
                "DaoDon Founders Card grants the holder access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
            tokenUri: {
                raw: 'https://metadata.bitgem.co/buildersdao/1',
                gateway: 'https://metadata.bitgem.co/buildersdao/1',
            },
            media: [
                {
                    raw: 'https://lh3.googleusercontent.com/MZHSgjw1C-0tOHZszC517DyIZlenxz4-R-Df3NhVlaasJh7nsIbK_YarGi9-kCIastJVOkoOERiVvxXgspjG8KDPTx1N1AuibEO2gu0',
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-mainnet/e54ddaea6593e1684d3de19924eb5981',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnail/eth-mainnet/e54ddaea6593e1684d3de19924eb5981',
                    format: 'png',
                    bytes: 232209,
                },
            ],
            metadata: {
                name: 'DaoDon Founders Card',
                description:
                    "DaoDon Founders Card grants the holder access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
                image: 'https://lh3.googleusercontent.com/MZHSgjw1C-0tOHZszC517DyIZlenxz4-R-Df3NhVlaasJh7nsIbK_YarGi9-kCIastJVOkoOERiVvxXgspjG8KDPTx1N1AuibEO2gu0',
                attributes: [
                    {
                        trait_count: 0,
                        value: 'Founders Edition',
                        trait_type: 'Rarity',
                    },
                    {
                        trait_count: 0,
                        value: 'Builder',
                        trait_type: 'Type',
                    },
                ],
            },
            timeLastUpdated: '2022-12-18T01:41:33.705Z',
            contractMetadata: {
                tokenType: 'ERC1155',
                openSea: {
                    floorPrice: 4.2069,
                    collectionName: 'DaoDon Founders',
                    safelistRequestStatus: 'disabled_top_trending',
                    imageUrl:
                        'https://i.seadn.io/gae/j1l_Hq1q6MCO_diS6J0HPlFE8gwOqvzVZ-mGZsoLx6aCe2HvHZWiNp6S6FAo7csSK5oNsHHhalqp2iPkePHsyfBZqrpJ3oa0C_y1?w=500&auto=format',
                    description:
                        "The DaoDon Founders Card grants holders access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
                    discordUrl: 'https://discord.gg/sSHj9kgk',
                    lastIngestedAt: '2023-01-10T00:39:09.000Z',
                },
            },
        },
        {
            contract: {
                address: '0x04bc6a8631aac43a66db41f33e6fe428c4d3e91f',
            },
            id: {
                tokenId: '0x00000000000000000000000000000000000000000000000000000000000000fb',
                tokenMetadata: {
                    tokenType: 'ERC721',
                },
            },
            balance: '1',
            title: 'smol frens #252',
            description:
                "The summer of 2022 will go down as the best summer in NFT's. This is to celebrate it. cc0 summer with 2022 frens.",
            tokenUri: {
                raw: 'ipfs://QmV7kgsn9ETrzfH1aYNcyfPa6NsUW8UJPXzjgn7THa68yM/252.json',
                gateway:
                    'https://alchemy.mypinata.cloud/ipfs/QmV7kgsn9ETrzfH1aYNcyfPa6NsUW8UJPXzjgn7THa68yM/252.json',
            },
            media: [
                {
                    raw: 'ipfs://Qmd3cXBvZsVJkAUrjYRD7AvrMG8NjDDJ1uxwAUobdp2gqT/252.png',
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-mainnet/e2f1220fca1f56de50762afe1294209a',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnail/eth-mainnet/e2f1220fca1f56de50762afe1294209a',
                    format: 'png',
                    bytes: 14070,
                },
            ],
            metadata: {
                name: 'smol frens #252',
                description:
                    "The summer of 2022 will go down as the best summer in NFT's. This is to celebrate it. cc0 summer with 2022 frens.",
                image: 'ipfs://Qmd3cXBvZsVJkAUrjYRD7AvrMG8NjDDJ1uxwAUobdp2gqT/252.png',
                attributes: [
                    {
                        value: 'Orange',
                        trait_type: 'Background',
                    },
                    {
                        value: 'Smol',
                        trait_type: 'Type',
                    },
                    {
                        value: 'Pink Tee',
                        trait_type: 'Shirt',
                    },
                    {
                        value: 'Orange',
                        trait_type: 'Pants',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Mouth',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Feet',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Eyes',
                    },
                    {
                        value: 'Headband Orange',
                        trait_type: 'Hats',
                    },
                ],
            },
            timeLastUpdated: '2022-12-20T18:53:40.519Z',
            contractMetadata: {
                name: 'smolfrens',
                symbol: 'sf',
                totalSupply: '285',
                tokenType: 'ERC721',
                contractDeployer: '0x1340676ab8aeb4dbd97b100b35aa169c533c01a5',
                deployedBlockNumber: 14918426,
                openSea: {
                    floorPrice: 0,
                    collectionName: 'oldsmolfrensworld',
                    safelistRequestStatus: 'not_requested',
                    imageUrl:
                        'https://i.seadn.io/gcs/files/d2101c202e6333beada3e953100a8d3f.png?w=500&auto=format',
                    description:
                        'Old Contract New contract is here - https://opensea.io/collection/smolfrensworld',
                    externalUrl: 'https://opensea.io/collection/smolfrensworld',
                    lastIngestedAt: '2023-01-10T00:51:59.000Z',
                },
            },
        },
    ],
}

export const getNftsMockPage2 = {
    pageKey: undefined,
    totalCount: 4,
    blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ownedNfts: [
        {
            contract: {
                address: '0x047fb9f175f796cdc34f92624492d73df58370e1',
            },
            id: {
                tokenId: '0x01',
                tokenMetadata: {
                    tokenType: 'ERC1155',
                },
            },
            balance: '1',
            title: 'DaoDon Founders Card',
            description:
                "DaoDon Founders Card grants the holder access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
            tokenUri: {
                raw: 'https://metadata.bitgem.co/buildersdao/1',
                gateway: 'https://metadata.bitgem.co/buildersdao/1',
            },
            media: [
                {
                    raw: 'https://lh3.googleusercontent.com/MZHSgjw1C-0tOHZszC517DyIZlenxz4-R-Df3NhVlaasJh7nsIbK_YarGi9-kCIastJVOkoOERiVvxXgspjG8KDPTx1N1AuibEO2gu0',
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-mainnet/e54ddaea6593e1684d3de19924eb5981',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnail/eth-mainnet/e54ddaea6593e1684d3de19924eb5981',
                    format: 'png',
                    bytes: 232209,
                },
            ],
            metadata: {
                name: 'DaoDon Founders Card',
                description:
                    "DaoDon Founders Card grants the holder access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
                image: 'https://lh3.googleusercontent.com/MZHSgjw1C-0tOHZszC517DyIZlenxz4-R-Df3NhVlaasJh7nsIbK_YarGi9-kCIastJVOkoOERiVvxXgspjG8KDPTx1N1AuibEO2gu0',
                attributes: [
                    {
                        trait_count: 0,
                        value: 'Founders Edition',
                        trait_type: 'Rarity',
                    },
                    {
                        trait_count: 0,
                        value: 'Builder',
                        trait_type: 'Type',
                    },
                ],
            },
            timeLastUpdated: '2022-12-18T01:41:33.705Z',
            contractMetadata: {
                tokenType: 'ERC1155',
                openSea: {
                    floorPrice: 4.2069,
                    collectionName: 'DaoDon Founders',
                    safelistRequestStatus: 'disabled_top_trending',
                    imageUrl:
                        'https://i.seadn.io/gae/j1l_Hq1q6MCO_diS6J0HPlFE8gwOqvzVZ-mGZsoLx6aCe2HvHZWiNp6S6FAo7csSK5oNsHHhalqp2iPkePHsyfBZqrpJ3oa0C_y1?w=500&auto=format',
                    description:
                        "The DaoDon Founders Card grants holders access to Premium Web 3 Perks and Founders' Access to BuildersDAO.",
                    discordUrl: 'https://discord.gg/sSHj9kgk',
                    lastIngestedAt: '2023-01-10T00:39:09.000Z',
                },
            },
        },
        {
            contract: {
                address: '0x04bc6a8631aac43a66db41f33e6fe428c4d3e91f',
            },
            id: {
                tokenId: '0x00000000000000000000000000000000000000000000000000000000000000fb',
                tokenMetadata: {
                    tokenType: 'ERC721',
                },
            },
            balance: '1',
            title: 'smol frens #252',
            description:
                "The summer of 2022 will go down as the best summer in NFT's. This is to celebrate it. cc0 summer with 2022 frens.",
            tokenUri: {
                raw: 'ipfs://QmV7kgsn9ETrzfH1aYNcyfPa6NsUW8UJPXzjgn7THa68yM/252.json',
                gateway:
                    'https://alchemy.mypinata.cloud/ipfs/QmV7kgsn9ETrzfH1aYNcyfPa6NsUW8UJPXzjgn7THa68yM/252.json',
            },
            media: [
                {
                    raw: 'ipfs://Qmd3cXBvZsVJkAUrjYRD7AvrMG8NjDDJ1uxwAUobdp2gqT/252.png',
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-mainnet/e2f1220fca1f56de50762afe1294209a',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnail/eth-mainnet/e2f1220fca1f56de50762afe1294209a',
                    format: 'png',
                    bytes: 14070,
                },
            ],
            metadata: {
                name: 'smol frens #252',
                description:
                    "The summer of 2022 will go down as the best summer in NFT's. This is to celebrate it. cc0 summer with 2022 frens.",
                image: 'ipfs://Qmd3cXBvZsVJkAUrjYRD7AvrMG8NjDDJ1uxwAUobdp2gqT/252.png',
                attributes: [
                    {
                        value: 'Orange',
                        trait_type: 'Background',
                    },
                    {
                        value: 'Smol',
                        trait_type: 'Type',
                    },
                    {
                        value: 'Pink Tee',
                        trait_type: 'Shirt',
                    },
                    {
                        value: 'Orange',
                        trait_type: 'Pants',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Mouth',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Feet',
                    },
                    {
                        value: 'Base',
                        trait_type: 'Eyes',
                    },
                    {
                        value: 'Headband Orange',
                        trait_type: 'Hats',
                    },
                ],
            },
            timeLastUpdated: '2022-12-20T18:53:40.519Z',
            contractMetadata: {
                name: 'smolfrens',
                symbol: 'sf',
                totalSupply: '285',
                tokenType: 'ERC721',
                contractDeployer: '0x1340676ab8aeb4dbd97b100b35aa169c533c01a5',
                deployedBlockNumber: 14918426,
                openSea: {
                    floorPrice: 0,
                    collectionName: 'oldsmolfrensworld',
                    safelistRequestStatus: 'not_requested',
                    imageUrl:
                        'https://i.seadn.io/gcs/files/d2101c202e6333beada3e953100a8d3f.png?w=500&auto=format',
                    description:
                        'Old Contract New contract is here - https://opensea.io/collection/smolfrensworld',
                    externalUrl: 'https://opensea.io/collection/smolfrensworld',
                    lastIngestedAt: '2023-01-10T00:51:59.000Z',
                },
            },
        },
    ],
}

export const getNftsContractMetaMock = {
    pageKey: 'b',
    totalCount: 4,
    blockHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    ownedNftsContract: [
        {
            address: '0x047fb9f175f796cdc34f92624492d73df58370e1',
            tokenType: 'ERC1155',
            imageUrl:
                'https://i.seadn.io/gae/j1l_Hq1q6MCO_diS6J0HPlFE8gwOqvzVZ-mGZsoLx6aCe2HvHZWiNp6S6FAo7csSK5oNsHHhalqp2iPkePHsyfBZqrpJ3oa0C_y1?w=500&auto=format',
        },
        {
            name: 'smolfrens',
            address: '0x04bc6a8631aac43a66db41f33e6fe428c4d3e91f',
            symbol: 'sf',
            tokenType: 'ERC721',
            imageUrl:
                'https://i.seadn.io/gcs/files/d2101c202e6333beada3e953100a8d3f.png?w=500&auto=format',
        },
    ],
}

export const getCollectionMetadataAlchemyMock: GetContractMetadataAlchemyResponse = {
    address: '0xe785e82358879f061bc3dcac6f0444462d4b5330',
    name: 'World Of Women',
    symbol: 'WOW',
    totalSupply: '10000',
    tokenType: 'ERC721',
    contractDeployer: '0xc9b6321dc216d91e626e9baa61b06b0e4d55bdb1',
    deployedBlockNumber: 12907782,
    openSeaMetadata: {
        floorPrice: 1.895,
        collectionName: 'World of Women',
        // safelistRequestStatus: 'verified',
        imageUrl:
            'https://i.seadn.io/gae/EFAQpIktMBU5SU0TqSdPWZ4byHr3hFirL_mATsR8KWhM5z-GJljX8E73V933lkyKgv2SAFlfRRjGsWvWbQQmJAwu3F2FDXVa1C9F?w=500&auto=format',
        description:
            "World of Women is a collection of 10,000 NFTs that gives you full access to our network of artists, creators, entrepreneurs, and executives who are championing diversity and equal opportunity on the blockchain.\n\nCreated and illustrated by Yam Karkai (@ykarkai), World of Women has made prominent appearances at Christie's, The New Yorker and Billboard.\n\nJoin us to receive exclusive access to NFT drops, experiences, and much more.\n\nThe Time is WoW.",
        externalUrl: 'http://worldofwomen.art',
        twitterUsername: 'worldofwomennft',
        discordUrl: 'https://discord.gg/worldofwomen',
        lastIngestedAt: '2023-02-16T12:43:49.000Z',
    },
}

export const getCollectionMetadataInfuraMock: GetCollectionMetadataInfuraResponse = {
    contract: '0xe785e82358879f061bc3dcac6f0444462d4b5330',
    name: 'World Of Women',
    tokenType: 'ERC721',
    symbol: 'WOW',
}

export const getContractMetadataMock: ContractMetadata = {
    address: '0xe785e82358879f061bc3dcac6f0444462d4b5330',
    name: 'World Of Women',
    symbol: 'WOW',
    tokenType: 'ERC721',
    imageUrl:
        'https://i.seadn.io/gae/EFAQpIktMBU5SU0TqSdPWZ4byHr3hFirL_mATsR8KWhM5z-GJljX8E73V933lkyKgv2SAFlfRRjGsWvWbQQmJAwu3F2FDXVa1C9F?w=500&auto=format',
}

export const alchemyGetCollectionsMock = {
    contracts: [
        {
            address: '0x317a8fe0f1c7102e7674ab231441e485c64c178a',
            totalBalance: 1,
            numDistinctTokensOwned: 1,
            isSpam: false,
            tokenId: '0x0000000000000000000000000000000000000000000000000000000000043246',
            name: 'HAVAH Friends',
            title: 'Harvesting Papa',
            symbol: 'hHVHF',
            tokenType: 'ERC721',
            contractDeployer: '0x82148231d76dfc18a4d1c4063e694c179b7911ed',
            deployedBlockNumber: 8143848,
            opensea: {
                lastIngestedAt: '2023-03-20T20:28:50.000Z',
            },
            media: [
                {
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-goerli/9cbfd8dff17ceb7bee4735e48e27aaf8',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnailv2/eth-goerli/9cbfd8dff17ceb7bee4735e48e27aaf8',
                    raw: 'ipfs://bafkreibfiehrdmdr5nl2je27i3s672a3ie3fvekfkgmjb3ptflphvhwgry',
                    format: 'png',
                    bytes: 94679,
                },
            ],
        },
        {
            address: '0x8b69093be9574162eb50385515e01e6507abf07c',
            totalBalance: 2,
            numDistinctTokensOwned: 2,
            isSpam: false,
            tokenId: '0x0000000000000000000000000000000000000000000000000000000000000011',
            name: 'Space Owner',
            title: '',
            symbol: 'SPACE',
            tokenType: 'ERC721',
            contractDeployer: '0x86312a65b491cf25d9d265f6218ab013daca5e19',
            deployedBlockNumber: 8533417,
            opensea: {
                lastIngestedAt: '2023-03-22T00:32:58.000Z',
            },
            media: [
                {
                    gateway: '',
                    raw: '',
                },
            ],
        },
    ],
    pageKey: 'abcd',
    totalCount: 3,
}
export const alchemyGetCollectionsMockPage2 = {
    contracts: [
        {
            address: '0x317a8fe0f1c7102e7674ab231441e485c64c178a',
            totalBalance: 1,
            numDistinctTokensOwned: 1,
            isSpam: false,
            tokenId: '0x0000000000000000000000000000000000000000000000000000000000043246',
            name: 'HAVAH Friends',
            title: 'Harvesting Papa',
            symbol: 'hHVHF',
            tokenType: 'ERC721',
            contractDeployer: '0x82148231d76dfc18a4d1c4063e694c179b7911ed',
            deployedBlockNumber: 8143848,
            opensea: {
                lastIngestedAt: '2023-03-20T20:28:50.000Z',
            },
            media: [
                {
                    gateway:
                        'https://nft-cdn.alchemy.com/eth-goerli/9cbfd8dff17ceb7bee4735e48e27aaf8',
                    thumbnail:
                        'https://res.cloudinary.com/alchemyapi/image/upload/thumbnailv2/eth-goerli/9cbfd8dff17ceb7bee4735e48e27aaf8',
                    raw: 'ipfs://bafkreibfiehrdmdr5nl2je27i3s672a3ie3fvekfkgmjb3ptflphvhwgry',
                    format: 'png',
                    bytes: 94679,
                },
            ],
        },
    ],
    totalCount: 3,
}

export const infuraGetCollectionMock = {
    total: 3,
    pageNumber: 1,
    pageSize: 100,
    network: 'ETHEREUM',
    cursor: 'abcd',
    account: '0x0a267cf51ef038fc00e71801f5a524aec06e4f07',
    collections: [
        {
            contract: '0xec3d9441d8c5ce4147eec8d05ca337e662f7cf13',
            tokenType: 'ERC721',
            name: 'Doodle Prime Apes',
            symbol: 'DPA',
        },
        {
            contract: '0xd33eb0dc95aff1a5f6ca04ba6cc33acdf85e7f62',
            tokenType: 'ERC721',
            name: 'Fast Food Lil Baby Apes Club',
            symbol: 'WuW',
        },
    ],
}

export const infuraGetCollectionMockPage2 = {
    total: 3,
    pageNumber: 1,
    pageSize: 100,
    network: 'ETHEREUM',
    cursor: null,
    account: '0x0a267cf51ef038fc00e71801f5a524aec06e4f07',
    collections: [
        {
            contract: '0xce82d65314502ce39472a2442d4a2cbc4cb9f293',
            tokenType: 'ERC721',
            name: 'Animal Society',
            symbol: 'AS',
        },
    ],
}
