import axios from 'axios'
import { dlog } from '@river-build/dlog'
import { ethers } from 'ethers'
import { Client } from '@river-build/sdk'

import {
	getTestServerUrl,
	makeCreateSpaceParams,
	makeEthersProvider,
	makeTestClient,
	SpaceMetadataParams,
} from '../testUtils'
import { SpaceMemberMetadataResponse } from '../../src/routes/spaceMemberMetadata'
import { spaceDapp } from '../../src/contract-utils'

const log = dlog('stream-metadata:test:spaceMemberMetadata', {
	allowJest: true,
	defaultEnabled: true,
})

describe('integration/stream-metadata/:spaceAddress/token/:tokenId', () => {
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

	async function createSpace(spaceMetadata: SpaceMetadataParams) {
		const createSpaceParams = await makeCreateSpaceParams(
			bobsClient.userId,
			spaceDapp,
			spaceMetadata,
		)
		const provider = makeEthersProvider(bobsWallet)
		await provider.fundWallet()

		const tx = await spaceDapp.createLegacySpace(createSpaceParams, provider.signer)
		const receipt = await tx.wait()
		expect(receipt.status).toBe(1)

		const spaceAddress = spaceDapp.getSpaceAddress(receipt, provider.wallet.address)
		expect(spaceAddress).toBeDefined()
		const spaceStreamId = await bobsClient.createSpace(spaceAddress!)
		expect(spaceStreamId).toBeDefined()
		return spaceAddress!
	}

	async function runTest(
		spaceAddress: string,
		tokenId: number,
		spaceMetadata: SpaceMetadataParams,
	) {
		const route = `space/${spaceAddress}/token/${tokenId}`
		const response = await axios.get<SpaceMemberMetadataResponse>(`${baseURL}/${route}`)

		const { name, description, image, attributes } = response.data
		expect(response.status).toBe(200)
		expect(response.headers['content-type']).toContain('application/json')
		expect(name).toEqual(`${spaceMetadata.name} - Member`)
		expect(description).toEqual(`Member of ${spaceMetadata.name}`)
		expect(image).toContain(`${baseURL}/space/${spaceAddress}/image`)

		const renewalPrice = attributes.find((attr) => attr.trait_type === 'Renewal Price')
		expect(renewalPrice).toBeDefined()
		const membershipExpiration = attributes.find(
			(attr) => attr.trait_type === 'Membership Expiration',
		)
		expect(membershipExpiration).toBeDefined()
		const membershipBanned = attributes.find((attr) => attr.trait_type === 'Membership Banned')
		expect(membershipBanned?.value).toBe('false')
	}

	it('pass with valid space address and token id', async () => {
		const metadata = {
			name: 'Alice Space',
			uri: baseURL,
			shortDescription: 'This is a test space',
			longDescription: 'This is a test space',
		}
		const spaceAddress = await createSpace(metadata)
		await runTest(spaceAddress, 0, metadata)
	})

	it('should return 200 - any token id is valid for a space', async () => {
		const metadata = {
			name: 'Alice Space',
			uri: baseURL,
			shortDescription: 'This is a test space',
			longDescription: 'This is a test space',
		}
		const spaceAddress = await createSpace(metadata)
		const response = await axios.get<SpaceMemberMetadataResponse>(
			`${baseURL}/space/${spaceAddress}/token/42069`,
		)
		expect(response.status).toBe(200)
	})
})
