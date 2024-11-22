import axios, { AxiosResponse } from 'axios'
import { dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { Client } from '@river-build/sdk'

import {
	encryptAndSendMediaPayload,
	getTestServerUrl,
	makeCreateSpaceParams,
	makeEthersProvider,
	makeJpegBlob,
	makeTestClient,
	SpaceMetadataParams,
} from '../testUtils'
import { spaceMetadataBaseUrl, SpaceMetadataResponse } from '../../src/routes/spaceMetadata'
import { spaceDapp } from '../../src/contract-utils'

const log = dlog('stream-metadata:test:spaceMetadata', {
	allowJest: true,
	defaultEnabled: true,
})

describe('integration/stream-metadata/space/:spaceAddress', () => {
	const baseURL = getTestServerUrl()
	log('baseURL', baseURL)

	let bobsClient: Client
	let bobsWallet: ethers.Wallet

	beforeEach(async () => {
		bobsWallet = ethers.Wallet.createRandom()
		bobsClient = await makeTestClient(bobsWallet)
		await bobsClient.initializeUser()
		bobsClient.startSync()
	})

	afterEach(async () => {
		await bobsClient.stopSync()
	})

	async function runDecriptionTest(shortDescription: string, longDescription: string) {
		const expectedMetadata: SpaceMetadataParams = {
			name: 'bobs space',
			uri: '',
			shortDescription,
			longDescription,
		}

		const createSpaceParams = await makeCreateSpaceParams(
			bobsClient.userId,
			spaceDapp,
			expectedMetadata,
		)

		const provider = makeEthersProvider(bobsWallet)
		await provider.fundWallet()

		const tx = await spaceDapp.createLegacySpace(createSpaceParams, provider.signer)
		const receipt = await tx.wait()
		expect(receipt.status).toBe(1)

		const spaceAddress = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
		expect(spaceAddress).toBeDefined()
		if (!spaceAddress) {
			throw new Error('spaceAddress is undefined')
		}

		const spaceStreamId = await bobsClient.createSpace(spaceAddress)
		expect(spaceStreamId).toBeDefined()

		const route = `space/${spaceAddress}`
		const response = await axios.get<SpaceMetadataResponse>(`${baseURL}/${route}`)

		const { name, description, image } = response.data
		expect(response.status).toBe(200)
		expect(response.headers['content-type']).toContain('application/json')
		expect(name).toEqual(expectedMetadata.name)

		let expectedDescription: string
		if (shortDescription && longDescription) {
			expectedDescription = `${shortDescription}<br><br>${longDescription}`
		} else if (shortDescription) {
			expectedDescription = shortDescription
		} else {
			expectedDescription = longDescription
		}

		expect(description).toEqual(expectedDescription)
		expect(image).toBeDefined()
	}

	async function runSpaceImageTest(spaceUri: string) {
		const expectedMetadata: SpaceMetadataParams = {
			name: 'bobs space',
			uri: spaceUri,
			shortDescription: 'bobs space short description',
			longDescription: 'bobs space long description',
		}

		/*
		 * 1. create a space on-chain.
		 */
		const createSpaceParams = await makeCreateSpaceParams(
			bobsClient.userId,
			spaceDapp,
			expectedMetadata,
		)

		const provider = makeEthersProvider(bobsWallet)
		await provider.fundWallet()

		const tx = await spaceDapp.createLegacySpace(createSpaceParams, provider.signer)
		const receipt = await tx.wait()
		expect(receipt.status).toBe(1)

		const spaceAddress = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
		expect(spaceAddress).toBeDefined()
		if (!spaceAddress) {
			throw new Error('spaceAddress is undefined')
		}

		/*
		 * 2. create a space stream.
		 */
		const { streamId: spaceStreamId } = await bobsClient.createSpace(spaceAddress)
		expect(spaceStreamId).toBeDefined()

		/*
		 * 3. upload a space image.
		 */
		const dataSize = 30
		const { data: imageData, info } = makeJpegBlob(dataSize)
		const chunkedMedia = await encryptAndSendMediaPayload(
			bobsClient,
			spaceStreamId,
			info,
			imageData,
		)

		const { eventId } = await bobsClient.setSpaceImage(spaceStreamId, chunkedMedia)

		/*
		 * 4. fetch the space metadata from the stream-metadata server.
		 */
		const route = `space/${spaceAddress}`
		let response: AxiosResponse<SpaceMetadataResponse>

		try {
			response = await axios.get<SpaceMetadataResponse>(`${baseURL}/${route}`, {
				maxRedirects: 0, // Prevent Axios from following redirects
				validateStatus: (status) => status < 400, // Only reject if status is 400 or higher
			})
		} catch (error: unknown) {
			if (axios.isAxiosError(error) && error.response && error.response.status === 302) {
				response = error.response as AxiosResponse<SpaceMetadataResponse> // Capture the 302 response
			} else {
				throw error // Rethrow if it's not a 302
			}
		}

		const { name, description, image: imageUrl } = response.data
		expect(response.status).toBe(200)
		expect(response.headers['content-type']).toContain('application/json')
		expect(name).toEqual(expectedMetadata.name)
		const expectedDescription = `${expectedMetadata.shortDescription}<br><br>${expectedMetadata.longDescription}`
		expect(description).toEqual(expectedDescription)

		const expectedImageUrl = `${spaceMetadataBaseUrl}/${spaceAddress}/image/${eventId}`
		expect(imageUrl.toLowerCase()).toEqual(expectedImageUrl.toLowerCase())
	}

	it('should return 404 /space', async () => {
		const expectedStatus = 404
		const route = 'space'
		try {
			await axios.get(`${baseURL}/${route}`)
			throw new Error(`Expected request to fail with status ${expectedStatus})`)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				expect(error.response).toBeDefined()
				expect(error.response?.status).toBe(expectedStatus)
			} else {
				// If the error is not an Axios error, rethrow it
				throw error
			}
		}
	})

	it('should return 400 /space/0x', async () => {
		const expectedStatus = 400
		const route = 'space/0x'
		try {
			await axios.get(`${baseURL}/${route}`)
			throw new Error(`Expected request to fail with status ${expectedStatus})`)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				expect(error.response).toBeDefined()
				expect(error.response?.status).toBe(expectedStatus)
			} else {
				// If the error is not an Axios error, rethrow it
				throw error
			}
		}
	})

	it('should return status 200 - both descriptions have values', async () => {
		await runDecriptionTest('bobs space short description', 'bobs space long description')
	})

	it('should return status 200 - shortDescription has value, longDescription is empty', async () => {
		await runDecriptionTest('bobs space short description', '')
	})

	it('should return status 200 - shortDescription is empty, longDescription has value', async () => {
		await runDecriptionTest('', 'bobs space long description')
	})

	it('should return status 200 with spaceImage when uri is empty string', async () => {
		await runSpaceImageTest('')
	})

	it('should return status 200 with spaceImage when uri is whitespace', async () => {
		await runSpaceImageTest(' ')
	})

	it('should return status 200 even if spaceUri is https://example.com', async () => {
		await runSpaceImageTest('https://example.com')
	})
})
