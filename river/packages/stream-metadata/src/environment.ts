import * as dotenv from 'dotenv'

import { Config } from './types'
import { getWeb3Deployment } from '@river-build/web3'

const isDev = process.env.NODE_ENV === 'development'
const envFile = isDev ? '.env.localhost' : '.env'

dotenv.config({
	path: envFile,
})

export const SERVER_PORT = parseInt(process.env.PORT ?? '443', 10)
export const config = makeConfig(process.env.RIVER_ENV, process.env.RIVER_CHAIN_RPC_URL)

function makeConfig(
	riverEnv = 'omega',
	riverChainRpcUrl = 'https://mainnet.rpc.river.build/http',
): Config {
	const web3Config = getWeb3Deployment(riverEnv)
	return {
		...web3Config,
		riverEnv,
		riverChainRpcUrl,
	}
}

console.log('config', {
	riverEnv: config.riverEnv,
	chainId: config.river.chainId,
	riverRegistry: config.river.addresses.riverRegistry,
	riverChainRpcUrl: config.riverChainRpcUrl,
})
