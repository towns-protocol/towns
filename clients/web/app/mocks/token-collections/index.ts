import { MOCK_CONTRACT_METADATA_RESPONSE } from '../../src/components/Web3/CreateSpaceForm/mock'

export function tokenCollections() {
    return MOCK_CONTRACT_METADATA_RESPONSE
}

export const TEST_TOKEN_METADATA_ADDRESSES = [
    '0x4d224452801ACEd8B2F0aebE155379bb5D594381'.toLowerCase(),
    '0xfA9937555Dc20A020A161232de4D2B109C62Aa9c'.toLowerCase(),
]

export const APECOIN_MOCK = {
    address: TEST_TOKEN_METADATA_ADDRESSES[0],
    name: 'ApeCoin',
    symbol: 'APE',
    tokenType: 'ERC20',
    imageUrl: 'https://etherscan.io/token/images/apecoin_32.png',
}

export const SUDOLETS_MOCK = {
    address: TEST_TOKEN_METADATA_ADDRESSES[1],
    name: 'Sudolets',
    symbol: 'LETS',
    tokenType: 'ERC721',
    imageUrl: 'https://i.seadn.io/gcs/files/a1e9b73a0e24640bf2e9bf145ebba3cd.png?w=500&auto=format',
}

export const getContractMetadataMock: {
    [x: string]: {
        address: string
        name: string
        symbol: string
        tokenType: string
        imageUrl: string
    }
} = {
    [TEST_TOKEN_METADATA_ADDRESSES[0]]: APECOIN_MOCK,
    [TEST_TOKEN_METADATA_ADDRESSES[1]]: SUDOLETS_MOCK,
} as const

export const getContractMetadataAcrossNetworksMock = {
    [TEST_TOKEN_METADATA_ADDRESSES[0]]: {
        chainId: 1,
        data: APECOIN_MOCK,
    },
    [TEST_TOKEN_METADATA_ADDRESSES[1]]: {
        chainId: 1,
        data: SUDOLETS_MOCK,
    },
} as const
