import { Env, worker } from '../src/index'
import { createTownFakeRequest, joinTownFakeRequest, linkWalletFakeRequest } from './test_utils'
import { STACKUP_API_URL } from '../src/router'

const FAKE_SERVER_URL = 'http://fakeserver.com'
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

    test('verify createTown', async () => {
        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                createTownFakeRequest as BodyInit,
            ),
        )
        expect(result.status).toBe(404)

        const text = await result.text()
        const statusText = result.statusText
        expect(text).toBe('Invalid Paymaster Response')
    })

    test('verify createTown without skip townId verification', async () => {
        const env = getMiniflareBindings()
        env.SKIP_TOWNID_VERIFICATION = 'false'
        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                createTownFakeRequest as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(401)

        const text = await result.text()
        expect(text).toContain('Unauthorized')
    })

    test('verify createTown with mocked fetch to Stackup api', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const url = new URL(STACKUP_API_URL)
        const origin = fetchMock.get(url.origin)
        const env = getMiniflareBindings()
        env.SKIP_TOWNID_VERIFICATION = 'true'
        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'stackup api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}/${env.STACKUP_API_TOKEN}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                createTownFakeRequest as BodyInit,
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
        const url = new URL(STACKUP_API_URL)
        const origin = fetchMock.get(url.origin)
        const env = getMiniflareBindings()
        env.SKIP_TOWNID_VERIFICATION = 'true'
        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'stackup api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}/${env.STACKUP_API_TOKEN}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                joinTownFakeRequest as BodyInit,
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
        const url = new URL(STACKUP_API_URL)
        const origin = fetchMock.get(url.origin)
        const env = getMiniflareBindings()
        env.SKIP_TOWNID_VERIFICATION = 'true'
        const resultErrorStackup = {
            id: 1,
            jsonrpc: '2.0',
            error: { message: 'stackup api error', code: 1 },
        }
        origin
            .intercept({
                method: 'POST',
                path: `${url.pathname}/${env.STACKUP_API_TOKEN}`, // user 1, public image variant
            })
            .reply(400, resultErrorStackup)

        const result = await worker.fetch(
            ...generateRequest(
                'api/sponsor-userop',
                'POST',
                {
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                linkWalletFakeRequest as BodyInit,
                env,
            ),
        )
        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid Paymaster Response')
    })
})
