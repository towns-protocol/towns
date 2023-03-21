import { env, hasGoerliParam, hasVitalkTokensParam } from 'utils'

/**
 * This file is purely for network calls to Alchemy that are using the token-worker
 * These calls are independent of any network the user is connected to, or our app
 * is configured against, or the matrix homeserver.
 *
 * These vars are used in specific points for fetching data from ALchmey's NFT api
 * for prototyping features.
 *
 * TODO: we need to accommodate sepolia
 */

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const fetchGoerli = env.IS_DEV && hasGoerliParam()
export const GOERLI = 'eth-goerli'
export const MAINNET = 'eth-mainnet'
export const NETWORK = fetchVitalikTokens ? MAINNET : GOERLI
