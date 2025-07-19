import axios from 'axios'
import { dlog } from '@towns-protocol/dlog'
import { ethers } from 'ethers'
import { Bot, makeRiverConfig, SyncAgent } from '@towns-protocol/sdk'

import { getTestServerUrl } from '../testUtils'

const log = dlog('test:stream-metadata:test:userSpaces', {
	allowJest: true,
	defaultEnabled: true,
})

interface UserSpacesResponsePayload {
	spaces: Array<{
		spaceId: string
		spaceAddress: string
		name?: string
		description?: string
		motto?: string
		image: string
	}>
}

describe('integration/stream-metadata/userSpaces', () => {
	const baseURL = getTestServerUrl()
	log('baseURL', baseURL)

	const riverConfig = makeRiverConfig()
	const bobIdentity = new Bot(undefined, riverConfig)
	const aliceIdentity = new Bot(undefined, riverConfig)
	let bob: SyncAgent
	let alice: SyncAgent

	beforeAll(async () => {
		await Promise.all([bobIdentity.fundWallet(), aliceIdentity.fundWallet()])

		bob = await bobIdentity.makeSyncAgent()
		alice = await aliceIdentity.makeSyncAgent()
		await Promise.all([bob.start(), alice.start()])
	})

	afterAll(async () => {
		await Promise.all([bob.stop(), alice.stop()])
	})

	test('should return 404 for user with no stream', async () => {
		// Create a new wallet that hasn't joined any spaces (no user stream exists)
		const newUserWallet = ethers.Wallet.createRandom()
		const route = `user/${newUserWallet.address}/spaces`
		log(`Fetching spaces for new user ${newUserWallet.address} from ${baseURL}/${route}`)

		try {
			await axios.get<UserSpacesResponsePayload>(`${baseURL}/${route}`)
			throw new Error('Expected request to fail with 404, but it succeeded.')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				// Expect 404 since the user stream doesn't exist yet
				expect(error.response?.status).toBe(404)
				log('Received expected 404 for user with no stream')
				return
			}
			throw error
		}
	})

	test('should return correct space IDs after user joins spaces', async () => {
		log('Creating first space')
		const { spaceId: space1Id } = await bob.spaces.createSpace(
			{ spaceName: 'TestSpace1_UserSpaces' },
			bobIdentity.signer,
		)
		log('First space created', space1Id)

		log('Creating second space')
		const { spaceId: space2Id } = await bob.spaces.createSpace(
			{ spaceName: 'TestSpace2_UserSpaces' },
			bobIdentity.signer,
		)
		log('Second space created', space2Id)

		// Alice joins both spaces
		await alice.spaces.joinSpace(space1Id, aliceIdentity.signer)
		log('Alice joined first space')
		await alice.spaces.joinSpace(space2Id, aliceIdentity.signer)
		log('Alice joined second space')

		// Allow some time for river nodes and clients to sync the stream updates
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Fetch Alice's spaces
		const aliceRoute = `user/${aliceIdentity.rootWallet.address}/spaces`
		const aliceResponse = await axios.get<UserSpacesResponsePayload>(`${baseURL}/${aliceRoute}`)

		expect(aliceResponse.status).toBe(200)
		expect(aliceResponse.headers['content-type']).toContain('application/json')
		expect(aliceResponse.data.spaces).toBeInstanceOf(Array)
		expect(aliceResponse.data.spaces.length).toBeGreaterThanOrEqual(2)

		// Check that both spaces are present
		const aliceSpaceIds = aliceResponse.data.spaces.map((space) => space.spaceId)
		expect(aliceSpaceIds).toContain(space1Id)
		expect(aliceSpaceIds).toContain(space2Id)

		// Verify spaces have required properties
		aliceResponse.data.spaces.forEach((space) => {
			expect(space.spaceId).toBeDefined()
			expect(space.spaceAddress).toBeDefined()
			expect(space.image).toContain('/space/')
			expect(space.image).toContain('/image')
		})

		log("Alice's spaces verified:", aliceSpaceIds)

		// Fetch Bob's spaces (should include the spaces he created)
		const bobRoute = `user/${bobIdentity.rootWallet.address}/spaces`
		log(`Fetching Bob's spaces from ${baseURL}/${bobRoute}`)
		const bobResponse = await axios.get<UserSpacesResponsePayload>(`${baseURL}/${bobRoute}`)

		expect(bobResponse.status).toBe(200)
		expect(bobResponse.headers['content-type']).toContain('application/json')
		expect(bobResponse.data.spaces).toBeInstanceOf(Array)
		expect(bobResponse.data.spaces.length).toBeGreaterThanOrEqual(2)

		// Check that both spaces are present
		const bobSpaceIds = bobResponse.data.spaces.map((space) => space.spaceId)
		expect(bobSpaceIds).toContain(space1Id)
		expect(bobSpaceIds).toContain(space2Id)

		log("Bob's spaces verified:", bobSpaceIds)
	})

	test('should return 404 for a non-existent user', async () => {
		const fakeUserId = ethers.Wallet.createRandom().address
		const route = `user/${fakeUserId}/spaces`
		log(`Fetching spaces for non-existent user ${fakeUserId} from ${baseURL}/${route}`)

		try {
			await axios.get(`${baseURL}/${route}`)
			throw new Error('Expected request to fail with 404, but it succeeded.')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				expect(error.response?.status).toBe(404)
				log('Received expected 404 for non-existent user')
				return
			}
			throw error // Re-throw if it's not an Axios error
		}
	})

	test('should return 400 for an invalid userId format', async () => {
		const invalidUserId = 'not-an-address'
		const route = `user/${invalidUserId}/spaces`
		log(`Fetching spaces for invalid userId ${invalidUserId} from ${baseURL}/${route}`)

		try {
			await axios.get(`${baseURL}/${route}`)
			throw new Error('Expected request to fail with 400, but it succeeded.')
		} catch (error) {
			if (axios.isAxiosError(error)) {
				expect(error.response?.status).toBe(400)
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				expect(error.response?.data.message).toContain('Invalid userId')
				log('Received expected 400 for invalid userId format')
				return
			}
			throw error
		}
	})

	test('should return proper cache headers', async () => {
		// Use Bob's address since we know he has spaces from previous tests
		const route = `user/${bobIdentity.rootWallet.address}/spaces`
		log(`Checking cache headers for ${baseURL}/${route}`)

		const response = await axios.get<UserSpacesResponsePayload>(`${baseURL}/${route}`)

		expect(response.status).toBe(200)
		expect(response.headers['cache-control']).toContain('public')
		expect(response.headers['cache-control']).toContain('max-age=30')
		expect(response.headers['cache-control']).toContain('s-maxage=3600')
		log('Cache headers verified:', response.headers['cache-control'])
	})
})
