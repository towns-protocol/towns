import { Env, worker } from '../src/index'
import { toJson } from '../src/utils'
import { createSpaceFakeRequest, joinTownFakeRequest, linkWalletFakeRequest } from './test_utils'
import { env, createExecutionContext, waitOnExecutionContext, fetchMock } from 'cloudflare:test'
import { describe, it, expect, test, vi, beforeAll, afterEach } from 'vitest'

const FAKE_SERVER_URL = 'http://fake.com'
const AUTH_TOKEN = 'Zm9v'

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>

function generateRequest(
    route: string,
    method = 'GET',
    headers = {},
    body?: BodyInit,
    envOverride?: Env,
): [Request, Env] {
    const url = `${FAKE_SERVER_URL}/${route}`
    return [new IncomingRequest(url, { method, headers, body }), (envOverride ?? env) as Env]
}

const typedEnv = env as Env

beforeAll(() => {
    // Enable outbound request mocking...
    fetchMock.activate()
    // ...and throw errors if an outbound request isn't mocked
    fetchMock.disableNetConnect()
})
// Ensure we matched every mock we defined
afterEach(() => fetchMock.assertNoPendingInterceptors())

describe('http router', () => {
    test('pass wildcard route', async () => {
        const result = await worker.fetch(
            ...generateRequest('test', 'GET', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )
        expect(result.status).toBe(404)
        const text = await result.text()
        expect(text).toContain('Not Found')
    })

    // TODO: this test should mock/intercept anvil RPC calls
    // if anvil not running, you get  KV returned error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)
    test.skip('verify createSpace without skip townId verification', async () => {
        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(createSpaceFakeRequest),
                }) as BodyInit,
                {
                    ...typedEnv,
                    SKIP_TOWNID_VERIFICATION: 'false',
                },
            ),
        )
        expect(result.status).toBe(401)

        const text = await result.text()
        expect(text).toContain('Unauthorized')
    })

    test('verify createSpace with mocked fetch to Alchemy api', async () => {
        const url = new URL(typedEnv.ALCHEMY_PAYMASTER_RPC_URL as string)

        const origin = fetchMock.get(url.origin)

        const resultError = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}`,
            })
            .reply(400, resultError)

        const spy = vi.spyOn(globalThis, 'fetch')

        await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop/alchemy',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(createSpaceFakeRequest),
                }) as BodyInit,
                {
                    ...typedEnv,
                    SKIP_TOWNID_VERIFICATION: 'true',
                },
            ),
        )

        let lastCall = spy.mock.lastCall
        let requestBody = JSON.parse(lastCall?.[1]?.body as string)
        expect(requestBody.method).toBe('alchemy_requestGasAndPaymasterAndData')
        expect(requestBody.params[0].overrides).toStrictEqual({
            maxFeePerGas: { multiplier: 1.2 },
            maxPriorityFeePerGas: {
                multiplier: 1.2,
            },
            callGasLimit: { multiplier: 1.2 },
            verificationGasLimit: {
                multiplier: 1.2,
            },
            preVerificationGas: {
                multiplier: 1.2,
            },
        })
    })

    test('verify createSpace with gas overrides', async () => {
        const url = new URL(typedEnv.ALCHEMY_PAYMASTER_RPC_URL as string)
        const origin = fetchMock.get(url.origin)

        const resultError = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}`,
            })
            .reply(400, resultError)

        const spy = vi.spyOn(globalThis, 'fetch')
        const gasOverrides = {
            maxFeePerGas: '0x1234',
            maxPriorityFeePerGas: '0x1234',
        }
        const data = {
            ...JSON.parse(createSpaceFakeRequest),
            gasOverrides,
        }

        await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop/alchemy',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data,
                }) as BodyInit,
                {
                    ...typedEnv,
                    SKIP_TOWNID_VERIFICATION: 'true',
                },
            ),
        )

        let lastCall = spy.mock.lastCall
        let requestBody = JSON.parse(lastCall?.[1]?.body as string)
        expect(requestBody.method).toBe('alchemy_requestGasAndPaymasterAndData')
        expect(requestBody.params[0].overrides).toStrictEqual({
            maxFeePerGas: '0x1234',
            maxPriorityFeePerGas: '0x1234',
            callGasLimit: { multiplier: 1.2 },
            verificationGasLimit: {
                multiplier: 1.2,
            },
            preVerificationGas: {
                multiplier: 1.2,
            },
        })
    })

    test('verify joinTown with mocked fetch to Stackup api', async () => {
        const url = new URL(typedEnv.LOCAL_PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)

        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'stackup api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(joinTownFakeRequest),
                }) as BodyInit,
                {
                    ...typedEnv,
                    SKIP_TOWNID_VERIFICATION: 'true',
                },
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })

    test('verify walletLink with skipped verification', async () => {
        const url = new URL(typedEnv.LOCAL_PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)

        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'stackup api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(linkWalletFakeRequest),
                }) as BodyInit,
                {
                    ...typedEnv,
                    SKIP_TOWNID_VERIFICATION: 'true',
                },
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })
})
