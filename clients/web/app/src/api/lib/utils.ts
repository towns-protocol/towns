import { env, hasVitalkTokensParam } from 'utils'

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const GOERLI = 'eth-goerli'
export const MAINNET = 'eth-mainnet'
export const NETWORK = fetchVitalikTokens ? MAINNET : GOERLI
