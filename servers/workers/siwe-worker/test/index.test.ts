import { jest } from '@jest/globals'
import { Permission } from '@river-build/web3'

const mockIsEntitled = jest.fn()

jest.unstable_mockModule('@river-build/web3', async () => {
	return {
		createSpaceDapp() {
			return {
				isEntitledToSpace: mockIsEntitled,
			}
		},
		// yes, jest sucks with esm and we can't do jest.requireActual, or import('@river-build/web3') from w/in the mock
		Permission,
	}
})

import { Env } from '../src/index'
const workerImport = await import('../src/index')
const worker = workerImport.worker

const FAKE_SERVER_URL = 'http://localhost'
const AUTH_TOKEN = 'Zm9v'

const GOOD_SIG =
	'0x969ec6cee0bd295be2ae4d9af1e759d6154738511bd0ad78825737c1c583e5d900166658ecb49a82c81cfbae53b23e8defa842fa56ed1312ae6be8f20afda6cb1c'
const GOOD_SIWE_MSG = {
	domain: 'localhost:4361',
	address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
	chainId: 31337,
	uri: 'http://localhost:4361',
	version: '1',
	statement: 'SIWE Notepad Example',
	nonce: '4gBymylmAjlqGOPpI',
	issuedAt: '2023-01-13T00:15:43.293Z',
}

const SPACE_ID = '!D0VFbAuDoMFGpn0T:node1.towns.com'
const CHAIN_ID = 5

const BAD_SIG =
	'0xBAD969ec6cee0bd295be2ae4d9af1e759d6154738511bd0ad78825737c1c583e5d900166658ecb49a82c81cfbae53b23e8defa842fa56ed1312ae6be8f20afda6cb1c'

const BAD_SIWE_MSG = {
	domain: 'localhost:4361',
	address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
	chainId: 31337,
	uri: 'http://localhost:4361',
	version: '1',
	statement: 'Bad Example',
	nonce: '4gBymylmAjlqGOPpI',
	issuedAt: '2023-01-13T00:15:43.293Z',
}

function generateRequest(
	route: string,
	method = 'GET',
	body = {} as BodyInit,
	headers = {},
): [Request, Env] {
	const url = `${FAKE_SERVER_URL}${route}`
	console.log(`env `, getMiniflareBindings())
	return [new Request(url, { method, headers, body }), getMiniflareBindings()]
}

describe('siwe auth handler', () => {
	test.skip('pass auth with good sig', async () => {
		mockIsEntitled.mockReturnValue(true)
		const result = await worker.fetch(
			...generateRequest(
				'/',
				'POST',
				JSON.stringify({
					message: GOOD_SIWE_MSG,
					signature: GOOD_SIG,
					spaceId: SPACE_ID,
					chainId: CHAIN_ID,
				}) as BodyInit,
				{
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
			),
		)

		expect(result.status).toBe(200)
		const text = await result.text()
		expect(text).toBe('OK')
	})

	test.skip('fails auth when good sig but bad permissions', async () => {
		mockIsEntitled.mockReturnValue(false)
		const result = await worker.fetch(
			...generateRequest(
				'/',
				'POST',
				JSON.stringify({
					message: GOOD_SIWE_MSG,
					signature: GOOD_SIG,
					spaceId: SPACE_ID,
					chainId: CHAIN_ID,
				}) as BodyInit,
				{
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
			),
		)

		expect(result.status).toBe(401)
		const text = await result.text()
		expect(text).toBe('Unauthorized')
	})

	test.skip('fail auth with bad sig', async () => {
		const result = await worker.fetch(
			...generateRequest(
				'/',
				'POST',
				JSON.stringify({
					message: GOOD_SIWE_MSG,
					signature: BAD_SIG,
					spaceId: SPACE_ID,
					chainId: CHAIN_ID,
				}) as BodyInit,
				{
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
			),
		)

		expect(result.status).toBe(401)

		const text = await result.text()
		expect(text).toBe('Unauthorized')
	})

	test.skip('fail auth with bad msg', async () => {
		const result = await worker.fetch(
			...generateRequest(
				'/',
				'POST',
				JSON.stringify({
					message: BAD_SIWE_MSG,
					signature: GOOD_SIG,
					spaceId: SPACE_ID,
					chainId: CHAIN_ID,
				}) as BodyInit,
				{
					Authorization: `Bearer ${AUTH_TOKEN}`,
				},
			),
		)

		expect(result.status).toBe(401)

		const text = await result.text()
		expect(text).toBe('Unauthorized')
	})
})
