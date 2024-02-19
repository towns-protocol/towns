import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'

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

export function mapTokenDataStructToTokenPillSelectorSelection(
    tokens: TokenDataStruct[],
): Set<string> {
    const selectedTokens = new Set<string>()
    // map tokens to a string like <address>__TOKEN_ID__<token_id>
    tokens.forEach((token: TokenDataStruct) => {
        if (token.tokenIds.length) {
            token.tokenIds.forEach((tokenId) => {
                selectedTokens.add(`${token.contractAddress}__TOKEN_ID__${tokenId}`)
            })
        } else {
            selectedTokens.add(token.contractAddress)
        }
    })
    return selectedTokens
}

export function mapTokenPillSelectorSelectionToTokenDataStruct(tokenSelection: Set<string>) {
    // tokens is a set of strings like <address>__TOKEN_ID__<token_id> "0x1234__TOKEN_ID__1"
    // token_id is needed for ERC1155 tokens
    const tokenDataArray: TokenDataStruct[] = []
    tokenSelection.forEach((tokenIdString) => {
        const [contractAddress, tokenId] = splitKeyToContractAddressAndTokenId(tokenIdString)
        if (!contractAddress) {
            return
        }
        const match = tokenDataArray.find((x) => x.contractAddress === contractAddress)

        if (match) {
            if (tokenId !== undefined) {
                match.tokenIds.push(+tokenId)
            }
        } else {
            tokenDataArray.push({
                contractAddress,
                tokenIds: tokenId !== undefined ? [+tokenId] : [],
            })
        }

        if (match?.tokenIds.length) {
            match.tokenIds = Array.from(new Set(match.tokenIds))
        }
    })
    return tokenDataArray
}
