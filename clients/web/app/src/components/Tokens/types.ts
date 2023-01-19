export interface TokenProps extends TokenData {
    onClick?: (contractAddress: string) => void
}

export interface TokenData {
    imgSrc: string
    label: string
    contractAddress: string
}
