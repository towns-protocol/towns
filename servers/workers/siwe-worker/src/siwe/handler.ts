import { SiweMessage } from 'siwe'
import { SpaceDapp } from 'use-zion-client/src/client/web3/SpaceDapp'
import { SpaceInfo } from 'use-zion-client/src/client/web3/SpaceInfo'
import { ethers } from 'ethers'

const GOERLI = 5

export async function verifySiweMessage(
	request: Request,
	provider: ethers.providers.StaticJsonRpcProvider,
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
	const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId, false)
	if ((spaceInfo as SpaceInfo).owner === address) {
		return true
	}
	console.log('spaceInfo.owner ', { owner: (spaceInfo as SpaceInfo).owner, spaceInfo })
	return false
}
