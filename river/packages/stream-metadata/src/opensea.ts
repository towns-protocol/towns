import { BASE_MAINNET, BASE_SEPOLIA, type SpaceInfo } from '@river-build/web3'
import { BigNumber } from 'ethers'
import { FastifyBaseLogger } from 'fastify'

import { config } from './environment'
import { spaceDapp } from './contract-utils'

const getOpenSeaAPIUrl = (logger: FastifyBaseLogger, space: SpaceInfo) => {
	const spaceOwnerAddress = config.web3Config.base.addresses.spaceOwner
	const chainId = config.web3Config.base.chainId
	const tokenId = BigNumber.from(space.tokenId).toString()

	if (chainId === BASE_MAINNET) {
		return `https://api.opensea.io/api/v2/chain/base/contract/${spaceOwnerAddress}/nfts/${tokenId}/refresh`
	} else if (chainId === BASE_SEPOLIA) {
		return `https://testnets-api.opensea.io/api/v2/chain/base_sepolia/contract/${spaceOwnerAddress}/nfts/${tokenId}/refresh`
	} else if (chainId === 31337) {
		return `https://testnets-api.opensea.io/api/v2/chain/base_sepolia/contract/${spaceOwnerAddress}/nfts/${tokenId}/refresh`
	} else {
		logger.error({ chainId }, 'Unsupported network')
		throw new Error(`Unsupported network ${chainId}`)
	}
}

export const refreshOpenSea = async ({
	logger,
	spaceAddress,
}: {
	logger: FastifyBaseLogger
	spaceAddress: string
}) => {
	if (!config.openSeaApiKey) {
		logger.warn(
			{
				spaceAddress,
			},
			'OpenSea API key not set, skipping OpenSea refresh',
		)
		return
	}

	const space = await spaceDapp.getSpaceInfo(spaceAddress)
	if (!space) {
		throw new Error('Space not found')
	}

	const url = getOpenSeaAPIUrl(logger, space)
	logger.info({ url, spaceAddress }, 'refreshing openSea')

	const response = await fetch(url, {
		method: 'POST',
		headers: {
			'x-api-key': config.openSeaApiKey,
		},
	})

	if (!response.ok) {
		logger.error(
			{ status: response.status, statusText: response.statusText, spaceAddress },
			'Failed to refresh OpenSea',
		)
		throw new Error('Failed to refresh OpenSea')
	}
}
