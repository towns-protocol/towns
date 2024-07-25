import { Env, worker } from '../src/index'
import { toJson } from '../src/utils'
import { createSpaceFakeRequest, joinTownFakeRequest, linkWalletFakeRequest } from './test_utils'

const FAKE_SERVER_URL = 'http:/server.com'
const AUTH_TOKEN = 'Zm9v'

function generateRequest(
    route: string,
    method = 'GET',
    headers = {},
    body?: BodyInit,
    env?: Env,
): [Request, Env] {
    const url = `${FAKE_SERVER_URL}/${route}`
    return [new Request(url, { method, headers, body }), env ?? getMiniflareBindings()]
}

describe('http router', () => {
    test('pass wildcard route', async () => {
        const result = await worker.fetch(
            ...generateRequest('test', 'GET', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )

        expect(result.status).toBe(404)

        const text = await result.text()
        expect(text).toBe('Not Found')
    })

    // TODO: this test should mock/intercept anvil RPC calls
    // if anvil not running, you get  KV returned error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)
    test.skip('verify createSpace without skip townId verification', async () => {
        const env = getMiniflareBindings()
        env.SKIP_TOWNID_VERIFICATION = 'false'
        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(createSpaceFakeRequest),
                    accessToken: 'fake',
                }) as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(401)

        const text = await result.text()
        expect(text).toContain('Unauthorized')
    })

    test('verify createSpace with mocked fetch to Stackup api', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const env = getMiniflareBindings()
        const url = new URL(env.PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)
        env.SKIP_TOWNID_VERIFICATION = 'true'
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
                    data: JSON.parse(createSpaceFakeRequest),
                    accessToken: 'fake',
                }) as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })

    test('verify createSpace with mocked fetch to Alchemy api', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const env = getMiniflareBindings()
        const url = new URL(env.PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)
        env.SKIP_TOWNID_VERIFICATION = 'true'
        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop/alchemy',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                toJson({
                    data: JSON.parse(createSpaceFakeRequest),
                    accessToken: 'fake',
                }) as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })

    test('verify joinTown with mocked fetch to Stackup api', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const env = getMiniflareBindings()
        const url = new URL(env.PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)
        env.SKIP_TOWNID_VERIFICATION = 'true'
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
                    accessToken: 'fake',
                }) as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })

    test('verify walletLink with skipped verification', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const env = getMiniflareBindings()
        const url = new URL(env.PAYMASTER_RPC_URL)
        const origin = fetchMock.get(url.origin)
        env.SKIP_TOWNID_VERIFICATION = 'true'
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
                    accessToken: 'fake',
                }) as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })
})
