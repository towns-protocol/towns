export function convertToNumber(val: string) {
    if (isNumeric(val)) {
        return parseFloat(val)
    } else {
        return NaN
    }
}

export function isNumeric(val: string) {
    return /^\d+(\.\d+)?$/.test(val)
}

const TOKEN_SPLITTER = '__TOKEN_ID__'

export function generateTokenIdKey(params: { contractAddress: string; tokenId: number }) {
    const { contractAddress, tokenId } = params
    return contractAddress + TOKEN_SPLITTER + tokenId
}

export function splitKeyToContractAddressAndTokenId(key: string) {
    return key.split(TOKEN_SPLITTER)
}
