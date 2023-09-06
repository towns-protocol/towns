import React from 'react'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'

export type TokenClickParameters = {
    contractAddress: TokenDataStruct['contractAddress']
    tokenIds?: number[] | undefined
}
export interface TokenProps extends TokenData {
    onClick?: (args: TokenClickParameters, e: React.MouseEvent) => void
}

export type TokenData = {
    imgSrc: string
    label: string
    contractAddress: TokenDataStruct['contractAddress']
    type?: TokenType | undefined
}

export enum TokenType {
    ERC1155 = 'ERC1155',
    ERC721 = 'ERC721',
    ERC20 = 'ERC20',
}
