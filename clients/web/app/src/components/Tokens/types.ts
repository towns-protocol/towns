import React from 'react'

export interface TokenProps extends TokenData {
    onClick?: (contractAddress: string, e: React.MouseEvent) => void
}

export type TokenData = {
    imgSrc: string
    label: string
    contractAddress: string
}
