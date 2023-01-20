import { env } from './environment'

export const hasQueryParam = (query: string) => {
    if (!env.IS_DEV) {
        return false
    }
    return new URLSearchParams(window.location.search).get(query) != undefined
}

// For debugging
// Use ?vitalikTokens to grab Vitalik's tokens from mainnet
// when fetching tokens for a wallet
export const hasVitalkTokensParam = () => {
    return hasQueryParam('vitalikTokens')
}
