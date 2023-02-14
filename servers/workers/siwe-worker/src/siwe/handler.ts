import { SiweMessage } from 'siwe'
import { SpaceDapp } from 'use-zion-client/src/client/web3/SpaceDapp'
import { SpaceInfo } from 'use-zion-client/src/client/web3/SpaceInfo'
import { ethers } from 'ethers'
import { Env } from '..'

const GOERLI_RPC_URL = 'https://eth-goerli.g.alchemy.com/v2/'
const LOCALHOST_RPC_URL = 'http://127.0.0.1:8545' // not localhost

const providerMap = new Map<string, string>([
	['development', LOCALHOST_RPC_URL],
	['staging', GOERLI_RPC_URL],
	['production', GOERLI_RPC_URL],
])

const GOERLI = 5

export async function verifySiweMessage(
	request: Request,
	env: Env,
	verify = true,
): Promise<Response> {
	const { message, signature, spaceId } = (await request.json()) as {
		message: string
		signature: string
		spaceId: string
	}
	const siweMessage = new SiweMessage(message as string)
	await siweMessage.verify({ signature: signature as string })

	if (!verify) {
		return new Response(`OK`)
	}
	// Need to setup provider with skipFetchSetup flag
	// See issue: https://github.com/ethers-io/ethers.js/issues/1886
	// TODO: consider moving `providerMap` to env vars
	const network = ethers.providers.getNetwork(siweMessage.chainId)
	const provider = new ethers.providers.StaticJsonRpcProvider(
		{
			url:
				env.ENVIRONMENT == 'development'
					? `${providerMap.get(env.ENVIRONMENT)}`
					: `${providerMap.get(env.ENVIRONMENT)}${env.ALCHEMY_API_KEY}`,
			skipFetchSetup: true,
		},
		network,
	)

	const isSpaceOwner = await verifySpaceOwner(
		spaceId as string,
		siweMessage.address,
		siweMessage.chainId,
		provider,
	)
	if (isSpaceOwner) {
		return new Response(`OK`)
	}
	return new Response(`Unauthorized`, { status: 401 })
}

export async function verifySpaceOwner(
	spaceId: string,
	address: string,
	chainId: number = GOERLI,
	provider: ethers.providers.StaticJsonRpcProvider,
): Promise<boolean> {
	const spaceDapp = new SpaceDapp(chainId, provider, undefined)
	const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(
		decodeURIComponent(spaceId),
		false,
	)
	if ((spaceInfo as SpaceInfo).owner === address) {
		return true
	}
	console.log('spaceInfo.owner ', { owner: (spaceInfo as SpaceInfo).owner, spaceInfo })
	return false
}
