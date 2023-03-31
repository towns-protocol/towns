import { MOCK_CONTRACT_METADATA_RESPONSE } from '../../src/components/Web3/CreateSpaceForm/mock'

export function tokenCollections() {
    return MOCK_CONTRACT_METADATA_RESPONSE
}

export const MOCK_CONTRACT_METADATA_ADDRESSES = [
    '0xfA4D0250769B07FC132573ea38D758D159770998'.toLowerCase(),
    '0xfA9937555Dc20A020A161232de4D2B109C62Aa9c'.toLowerCase(),
]
export const getContractMetadataMock: {
    [x: string]: {
        address: string
        name: string
        symbol: string
        tokenType: string
        imageUrl: string
    }
} = {
    [MOCK_CONTRACT_METADATA_ADDRESSES[0]]: {
        address: MOCK_CONTRACT_METADATA_ADDRESSES[0],
        name: 'Daisen.fi Investor Pass',
        symbol: 'Daisen.fi Investor Pass',
        tokenType: 'ERC1155',
        imageUrl:
            'https://i.seadn.io/gcs/files/65e3614fe54db77743b34bb1dccd8c85.jpg?w=500&auto=format',
    },
    [MOCK_CONTRACT_METADATA_ADDRESSES[1]]: {
        address: MOCK_CONTRACT_METADATA_ADDRESSES[1],
        name: 'Sudolets',
        symbol: 'LETS',
        tokenType: 'ERC721',
        imageUrl:
            'https://i.seadn.io/gcs/files/a1e9b73a0e24640bf2e9bf145ebba3cd.png?w=500&auto=format',
    },
} as const
