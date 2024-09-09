import { BASE_MAINNET, BASE_SEPOLIA, type SpaceInfo } from '@river-build/web3'
import { BigNumber } from 'ethers'
import { FastifyBaseLogger } from 'fastify'

import { config } from './environment'
import { spaceDapp } from './contract-utils'

const getOpenSeaAPIUrl = (space: SpaceInfo) => {
	const spaceOwnerAddress = config.web3Config.base.addresses.spaceOwner
	const tokenId = BigNumber.from(space.tokenId).toString()

	if (space.networkId === String(BASE_MAINNET)) {
		return `https://api.opensea.io/api/v2/chain/base/contract/${spaceOwnerAddress}/nfts/${tokenId}/refresh`
	} else if (space.networkId === String(BASE_SEPOLIA)) {
		return `https://testnets-api.opensea.io/api/v2/chain/base_sepolia/contract/${spaceOwnerAddress}/nfts/${tokenId}/refresh`
	} else {
		throw new Error('Unsupported network')
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

	const url = getOpenSeaAPIUrl(space)
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
