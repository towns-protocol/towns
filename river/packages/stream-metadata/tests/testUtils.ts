import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove

import { ethers } from 'ethers'
import { ChunkedMedia, CreationCookie, MediaInfo } from '@river-build/proto'
import {
	Client,
	encryptAESGCM,
	genId,
	makeSignerContext,
	makeSpaceStreamId,
	makeStreamRpcClient,
	MockEntitlementsDelegate,
	RiverDbManager,
	SignerContext,
	streamIdAsString,
	userIdFromAddress,
} from '@river-build/sdk'
import {
	CreateLegacySpaceParams,
	ETH_ADDRESS,
	getDynamicPricingModule,
	LegacyMembershipStruct,
	LocalhostWeb3Provider,
	NoopRuleData,
	Permission,
	SpaceDapp,
} from '@river-build/web3'

import { config } from '../src/environment'
import { getRiverRegistry } from '../src/evmRpcClient'

export function makeUniqueSpaceStreamId(): string {
	return makeSpaceStreamId(genId(40))
}

export function getTestServerUrl() {
	// use the .env.test config to derive the baseURL of the server under test
	const { streamMetadataBaseUrl } = config
	return streamMetadataBaseUrl
}

export async function getAnyNodeUrlFromRiverRegistry() {
	const riverRegistry = getRiverRegistry()
	const nodes = await riverRegistry.getAllNodeUrls()

	if (!nodes || nodes.length === 0) {
		return undefined
	}

	const randomIndex = Math.floor(Math.random() * nodes.length)
	const anyNode = nodes[randomIndex]

	return anyNode.url
}

export function makeEthersProvider(wallet: ethers.Wallet) {
	return new LocalhostWeb3Provider(config.baseChainRpcUrl, wallet)
}

export async function makeTestClient(wallet: ethers.Wallet): Promise<Client> {
	// create all the constructor arguments for the SDK client

	// arg: user context
	const context = await makeUserContext(wallet)

	// arg: stream rpc client
	const nodeUrl = await getAnyNodeUrlFromRiverRegistry()
	if (!nodeUrl) {
		throw new Error('No nodes available')
	}
	const rpcClient = makeStreamRpcClient(nodeUrl)

	// arg: crypto store
	const deviceId = `${genId(5)}`
	const userId = userIdFromAddress(context.creatorAddress)
	const dbName = `database-${userId}-${deviceId}`
	const cryptoStore = RiverDbManager.getCryptoDb(userId, dbName)

	// arg: entitlements delegate
	const entitlementsDelegate = new MockEntitlementsDelegate()

	// arg: persistence db name
	const persistenceDbName = `persistence-${userId}-${deviceId}`

	// create the client with all the args
	return new Client(context, rpcClient, cryptoStore, entitlementsDelegate, persistenceDbName)
}

export async function makeUserContext(wallet: ethers.Wallet): Promise<SignerContext> {
	const userPrimaryWallet = wallet
	const delegateWallet = ethers.Wallet.createRandom()
	return makeSignerContext(userPrimaryWallet, delegateWallet, { days: 1 })
}

export function makeJpegBlob(fillSize: number): {
	magicBytes: number[]
	data: Uint8Array
	info: MediaInfo
} {
	// Example of JPEG magic bytes (0xFF 0xD8 0xFF)
	const magicBytes = [0xff, 0xd8, 0xff]

	// Create a Uint8Array with the size including magic bytes
	const data = new Uint8Array(fillSize + magicBytes.length)

	// Set the magic bytes at the beginning
	data.set(magicBytes, 0)

	// Fill the rest of the array with arbitrary data
	for (let i = magicBytes.length; i < data.length; i++) {
		data[i] = i % 256 // Fill with some pattern
	}

	return {
		magicBytes,
		data,
		info: new MediaInfo({
			mimetype: 'image/jpeg', // Set the expected MIME type
			sizeBytes: BigInt(data.length),
		}),
	}
}

export async function encryptAndSendMediaPayload(
	client: Client,
	spaceId: string,
	info: MediaInfo,
	data: Uint8Array,
	chunkSize = 10,
): Promise<ChunkedMedia> {
	const { ciphertext, secretKey, iv } = await encryptAESGCM(data)
	const chunkCount = Math.ceil(ciphertext.length / chunkSize)

	const mediaStreamInfo = await client.createMediaStreamNew(
		undefined,
		spaceId,
		undefined,
		chunkCount,
	)

	if (!mediaStreamInfo) {
		throw new Error('Failed to create media stream')
	}

	let cc: CreationCookie = new CreationCookie(mediaStreamInfo.creationCookie)
	for (let i = 0, index = 0; i < ciphertext.length; i += chunkSize, index++) {
		const chunk = ciphertext.slice(i, i + chunkSize)
		const last = ciphertext.length - i <= chunkSize
		const { creationCookie } = await client.sendMediaPayloadNew(cc, last, chunk, index)

		cc = new CreationCookie({
			...cc,
			prevMiniblockHash: new Uint8Array(creationCookie.prevMiniblockHash),
			miniblockNum: creationCookie.miniblockNum,
		})
	}

	const chunkedMedia = new ChunkedMedia({
		info,
		streamId: streamIdAsString(mediaStreamInfo.creationCookie.streamId),
		encryption: {
			case: 'aesgcm',
			value: { secretKey, iv },
		},
		thumbnail: undefined,
	})

	return chunkedMedia
}

export interface SpaceMetadataParams {
	name: string
	uri: string
	shortDescription: string
	longDescription: string
}

export async function makeCreateSpaceParams(
	userId: string,
	spaceDapp: SpaceDapp,
	args: SpaceMetadataParams,
) {
	const { name: spaceName, uri: spaceImageUri, shortDescription, longDescription } = args
	/*
	 * assemble all the parameters needed to create a space.
	 */
	const dynamicPricingModule = await getDynamicPricingModule(spaceDapp)
	const membership: LegacyMembershipStruct = {
		settings: {
			name: 'Everyone',
			symbol: 'MEMBER',
			price: 0,
			maxSupply: 1000,
			duration: 0,
			currency: ETH_ADDRESS,
			feeRecipient: userId,
			freeAllocation: 0,
			pricingModule: dynamicPricingModule.module,
		},
		permissions: [Permission.Read, Permission.Write],
		requirements: {
			everyone: true,
			users: [],
			ruleData: NoopRuleData,
			syncEntitlements: false,
		},
	}
	// all create space args
	const createSpaceParams: CreateLegacySpaceParams = {
		spaceName: spaceName,
		uri: spaceImageUri,
		channelName: 'general',
		membership,
		shortDescription,
		longDescription,
	}
	return createSpaceParams
}
