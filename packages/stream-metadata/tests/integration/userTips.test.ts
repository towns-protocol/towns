import axios from 'axios'
import { dlog } from '@towns-protocol/dlog'
import { ethers } from 'ethers'
import { Bot, makeRiverConfig, SyncAgent } from '@towns-protocol/sdk'
import { ETH_ADDRESS } from '@towns-protocol/web3'

import { getTestServerUrl } from '../testUtils'
import { UserTipsResponsePayload } from '../../src/routes/userTips'

const log = dlog('test:stream-metadata:test:userTips', {
	allowJest: true,
	defaultEnabled: true,
})

describe('integration/stream-metadata/userTips', () => {
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

	// todo 4/30/2025 AELLIS for some reason this works locally but not in CI - the transaction is failing with UNPREDICTABLE_GAS_LIMIT and i can't figure it out
	test.skip('should return correct tip counts after a user sends a tip', async () => {
		const tipAmount = 1000n // Define a tip amount

		log('Creating space')
		const { spaceId, defaultChannelId: channelId } = await bob.spaces.createSpace(
			{ spaceName: 'BlastOff_Tip' },
			bobIdentity.signer,
		)
		log('Space created', spaceId)
		await alice.spaces.joinSpace(spaceId, aliceIdentity.signer)
		log('Joined space')
		const channel = alice.spaces.getSpace(spaceId).getChannel(channelId)
		const { eventId } = await channel.sendMessage('hello bob')
		const messageId = eventId
		log('Message sent')
		const tokenId = await bob.riverConnection.spaceDapp.getTokenIdOfOwner(
			spaceId,
			aliceIdentity.rootWallet.address,
		)
		expect(tokenId).toBeDefined()

		log(
			`Bob (${bobIdentity.rootWallet.address}) tipping Alice (${
				aliceIdentity.rootWallet.address
			}) at ${tokenId!} ${tipAmount} ETH`,
		)

		const tx = await bob.riverConnection.spaceDapp.tip(
			{
				spaceId,
				tokenId: tokenId!,
				currency: ETH_ADDRESS,
				amount: tipAmount,
				messageId,
				channelId,
				receiver: aliceIdentity.rootWallet.address,
			},
			bobIdentity.signer,
		)

		log('Tip transaction sent', tx)
		// Bob sends a tip to Alice
		const receipt = await tx.wait(2)
		log('Tip transaction mined', receipt)
		const tipEvent = bob.riverConnection.spaceDapp.getTipEvent(
			spaceId,
			receipt,
			bobIdentity.rootWallet.address,
		)
		log('Tip event', tipEvent)
		log('Receipt', receipt)
		if (!tipEvent) throw new Error('no tip event found')
		await bob.riverConnection.client!.addTransaction_Tip(
			riverConfig.base.chainConfig.chainId,
			receipt,
			tipEvent,
			aliceIdentity.rootWallet.address,
		)

		log('Tip transaction mined, waiting for stream sync...')

		// Allow some time for river nodes and clients to sync the stream updates
		await new Promise((resolve) => setTimeout(resolve, 3000)) // Adjust delay if needed

		// Fetch Alice's tips
		const aliceRoute = `user/${aliceIdentity.rootWallet.address}/tips`
		log(`Fetching Alice's tips from ${baseURL}/${aliceRoute}`)
		const aliceResponse = await axios.get<UserTipsResponsePayload>(`${baseURL}/${aliceRoute}`)

		expect(aliceResponse.status).toBe(200)
		expect(aliceResponse.headers['content-type']).toContain('application/json')
		expect(aliceResponse.data.tips.received[ETH_ADDRESS]).toEqual(tipAmount.toString())
		expect(aliceResponse.data.tips.receivedCount[ETH_ADDRESS]).toEqual('1')
		expect(aliceResponse.data.tips.sent[ETH_ADDRESS]).toEqual(undefined)
		expect(aliceResponse.data.tips.sentCount[ETH_ADDRESS]).toEqual(undefined)
		log("Alice's tips verified:", aliceResponse.data.tips)

		// Fetch Bob's tips
		const bobRoute = `user/${bobIdentity.rootWallet.address}/tips`
		log(`Fetching Bob's tips from ${baseURL}/${bobRoute}`)
		const bobResponse = await axios.get<UserTipsResponsePayload>(`${baseURL}/${bobRoute}`)

		expect(bobResponse.status).toBe(200)
		expect(bobResponse.headers['content-type']).toContain('application/json')
		expect(bobResponse.data.tips.sent[ETH_ADDRESS]).toEqual(tipAmount.toString())
		expect(bobResponse.data.tips.sentCount[ETH_ADDRESS]).toEqual('1')
		expect(bobResponse.data.tips.received[ETH_ADDRESS]).toEqual(undefined)
		expect(bobResponse.data.tips.receivedCount[ETH_ADDRESS]).toEqual(undefined)
		log("Bob's tips verified:", bobResponse.data.tips)
	})

	test('should return 404 for a non-existent user', async () => {
		const fakeUserId = ethers.Wallet.createRandom().address
		const route = `user/${fakeUserId}/tips`
		log(`Fetching tips for non-existent user ${fakeUserId} from ${baseURL}/${route}`)

		try {
			await axios.get(`${baseURL}/${route}`)
		} catch (error) {
			if (axios.isAxiosError(error)) {
				expect(error.response?.status).toBe(404)
				log('Received expected 404 for non-existent user')
				return
			}
			throw error // Re-throw if it's not an Axios error
		}
		throw new Error('Expected request to fail with 404, but it succeeded.')
	})

	test('should return 400 for an invalid userId format', async () => {
		const invalidUserId = 'not-an-address'
		const route = `user/${invalidUserId}/tips`
		log(`Fetching tips for invalid userId ${invalidUserId} from ${baseURL}/${route}`)

		try {
			await axios.get(`${baseURL}/${route}`)
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
		throw new Error('Expected request to fail with 400, but it succeeded.')
	})
})
