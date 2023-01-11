import { isDev } from './environment'

export const hasQueryParam = (query: string) => {
    if (!isDev) return false
    return new URLSearchParams(window.location.search).get(query) != undefined
}

// For debugging
// Use ?vitalikTokens to grab Vitalik's tokens from mainnet
// when fetching tokens for a wallet
export const hasVitalkTokensParam = () => {
    return hasQueryParam('vitalikTokens')
}
