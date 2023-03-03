import { env, hasGoerliParam, hasVitalkTokensParam } from 'utils'

export const fetchVitalikTokens = env.IS_DEV && hasVitalkTokensParam()
export const fetchGoerli = env.IS_DEV && hasGoerliParam()
export const GOERLI = 'eth-goerli'
export const MAINNET = 'eth-mainnet'
export const NETWORK = fetchVitalikTokens ? MAINNET : GOERLI
