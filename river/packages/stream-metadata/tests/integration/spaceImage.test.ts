import axios from 'axios'
import { ethers } from 'ethers'
import { dlog } from '@river-build/dlog'
import { Client, contractAddressFromSpaceId } from '@river-build/sdk'

import {
	encryptAndSendMediaPayload,
	getTestServerUrl,
	makeJpegBlob,
	makeTestClient,
	makeUniqueSpaceStreamId,
} from '../testUtils'

const log = dlog('stream-metadata:test:spaceImage', {
	allowJest: true,
	defaultEnabled: true,
})

describe('integration/stream-metadata/space/:spaceAddress/image', () => {
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

	it('should return 404 /space/0x0000000000000000000000000000000000000000/image', async () => {
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

	it('should return 400 /space/0x0/image', async () => {
		const expectedStatus = 400
		const route = 'space/0x0/image'
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

	it('should return status 200 with spaceImage', async () => {
		/**
		 * 1. create a space.
		 * 2. upload a space image.
		 * 3. fetch the space image from the stream-metadata server.
		 * 4. verify the response.
		 */

		/*
		 * 1. create a space.
		 */
		const spaceId = makeUniqueSpaceStreamId()
		await bobsClient.createSpace(spaceId)
		const spaceStream = await bobsClient.waitForStream(spaceId)
		log('spaceStreamId', spaceStream.streamId)

		/*
		 * 2. upload a space image.
		 */
		const dataSize = 30
		const { data: expectedData, magicBytes, info } = makeJpegBlob(dataSize)
		const chunkedMedia = await encryptAndSendMediaPayload(
			bobsClient,
			spaceId,
			info,
			expectedData,
		)

		await bobsClient.setSpaceImage(spaceId, chunkedMedia)

		// make a snapshot
		await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

		/*
		 * 3. fetch the space image from the stream-metadata server.
		 */
		const spaceContractAddress = contractAddressFromSpaceId(spaceId)
		const route = `space/${spaceContractAddress}/image`
		const response = await axios.get(`${baseURL}/${route}`, {
			responseType: 'arraybuffer', // Ensures that Axios returns the response as a buffer
		})

		expect(response.status).toBe(200)
		// Verify the Content-Type header matches the expected MIME type
		expect(response.headers['content-type']).toBe('image/jpeg')
		const responseData = new Uint8Array(response.data)
		// Verify the magic bytes in the response match the expected magic bytes
		expect(responseData.slice(0, magicBytes.length)).toEqual(new Uint8Array(magicBytes))
		// Verify the entire response data matches the expected data
		expect(responseData).toEqual(expectedData)
	})

	it('should return status 404 without spaceImage', async () => {
		/**
		 * 1. create a space.
		 * 2. fetch the space image from the stream-metadata server.
		 * 3. expect 404.
		 */

		/*
		 * 1. create a space.
		 */
		const spaceId = makeUniqueSpaceStreamId()
		await bobsClient.createSpace(spaceId)
		const spaceStream = await bobsClient.waitForStream(spaceId)
		log('spaceStreamId', spaceStream.streamId)

		// make a snapshot
		await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

		/*
		 * 2. fetch the space image from the stream-metadata server.
		 */
		const spaceContractAddress = contractAddressFromSpaceId(spaceId)
		const route = `space/${spaceContractAddress}/image`
		const expectedStatus = 404
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
})
