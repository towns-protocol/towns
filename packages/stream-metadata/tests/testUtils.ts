import 'fake-indexeddb/auto' // used to mock indexdb in dexie, don't remove

import { ethers } from 'ethers'
import {
	ChunkedMedia,
	ChunkedMediaSchema,
	CreationCookie,
	CreationCookieSchema,
	MediaInfo,
	MediaInfoSchema,
} from '@towns-protocol/proto'
import { Client, streamIdAsString } from '@towns-protocol/sdk'
import { encryptAESGCM } from '@towns-protocol/sdk-crypto'
import {
	CreateLegacySpaceParams,
	ETH_ADDRESS,
	getDynamicPricingModule,
	LegacyMembershipStruct,
	LocalhostWeb3Provider,
	NoopRuleData,
	Permission,
	SpaceDapp,
} from '@towns-protocol/web3'
import { create } from '@bufbuild/protobuf'

import { config } from '../src/environment'

export function getTestServerUrl() {
	// use the .env.test config to derive the baseURL of the server under test
	const { streamMetadataBaseUrl } = config
	return streamMetadataBaseUrl
}

export function makeEthersProvider(wallet: ethers.Wallet) {
	return new LocalhostWeb3Provider(config.baseChainRpcUrl, wallet)
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
		info: create(MediaInfoSchema, {
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

	const mediaStreamInfo = await client.createMediaStream(
		undefined,
		spaceId,
		undefined,
		chunkCount,
		ciphertext.slice(0, chunkSize),
	)

	if (!mediaStreamInfo) {
		throw new Error('Failed to create media stream')
	}

	// Add the rest of chunks if there are more than one which is passed in the creation request
	if (chunkCount > 1) {
		let cc: CreationCookie = create(CreationCookieSchema, mediaStreamInfo.creationCookie)
		for (let i = chunkSize, index = 1; i < ciphertext.length; i += chunkSize, index++) {
			const chunk = ciphertext.slice(i, i + chunkSize)
			const last = ciphertext.length - i <= chunkSize
			const { creationCookie } = await client.sendMediaPayload(cc, last, chunk, index)

			cc = create(CreationCookieSchema, {
				...cc,
				prevMiniblockHash: new Uint8Array(creationCookie.prevMiniblockHash),
				miniblockNum: creationCookie.miniblockNum,
			})
		}
	}

	const chunkedMedia = create(ChunkedMediaSchema, {
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
	const readApp = spaceDapp.readApp
	const pricingModules = await readApp.pricingModules.read.listPricingModules()
	const dynamicPricingModule = await getDynamicPricingModule(pricingModules)
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
