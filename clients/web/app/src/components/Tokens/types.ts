import { Address } from 'use-towns-client'

export type TokenData = {
    imgSrc: string
    label: string
    address: Address
    type: TokenType
    quantity: number | undefined
}

export type TokenDataWithChainId = {
    chainId: number
    data: TokenData
}

export enum TokenType {
    ERC1155 = 'ERC1155',
    ERC721 = 'ERC721',
    ERC20 = 'ERC20',
    NOT_A_CONTRACT = 'NOT_A_CONTRACT',
    UNKNOWN = 'UNKNOWN',
}

export type TokenPropsForVList = TokenData & { id: string }
