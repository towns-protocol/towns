import * as dotenv from 'dotenv'

import { ChainConfig } from './types'
import deploymentData from '@river-build/generated/config/deployments.json'

const isDev = process.env.NODE_ENV === 'development'
const envFile = isDev ? '.env.localhost' : '.env'

console.log('NODE_ENV:', process.env.NODE_ENV, 'isDev:', isDev, 'envFile:', envFile)

dotenv.config({
	path: envFile,
})

export const SERVER_PORT = parseInt(process.env.PORT ?? '443', 10)
export const config = makeConfig(deploymentData, process.env.RIVER_ENV ?? 'omega')

console.log('config:', config)

interface DeploymentsJson {
	[riverEnv: string]: {
		river: {
			chainId: number
			addresses: {
				riverRegistry: string
			}
		}
	}
}

interface AllChainConfig {
	[riverEnv: string]: {
		chainId: number
		riverRegistry: string
	}
}

function makeConfig(deploymentsJson: DeploymentsJson, riverEnv: string): ChainConfig {
	const allChainConfig: AllChainConfig = {}

	for (const key in deploymentsJson) {
		const envConfig = deploymentsJson[key]
		if (envConfig.river) {
			allChainConfig[key] = {
				chainId: envConfig.river.chainId,
				riverRegistry: envConfig.river.addresses.riverRegistry,
			}
		}
	}

	if (!allChainConfig[riverEnv].chainId || !allChainConfig[riverEnv].riverRegistry) {
		throw new Error('chainId or riverRegistry undefined')
	}

	return {
		chainId: allChainConfig[riverEnv].chainId,
		riverRegistry: allChainConfig[riverEnv].riverRegistry,
	}
}
