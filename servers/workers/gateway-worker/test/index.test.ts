import { IMAGE_DELIVERY_SERVICE } from '../src/handler'
import { Env, worker } from '../src/index'

const FAKE_SERVER_URL = 'http://fakeserver.com'
const FAKE_IMAGE_HASH = 'bar' // wrangler.test.toml
const AUTH_TOKEN = 'Zm9v'

function generateRequest(
    route: string,
    method = 'GET',
    headers = {},
    body?: BodyInit,
): [Request, Env] {
    const url = `${FAKE_SERVER_URL}/${route}`
    return [new Request(url, { method, headers, body }), getMiniflareBindings()]
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

    test('error get user avatar', async () => {
        const fetchMock = getMiniflareFetchMock()
        fetchMock.disableNetConnect()
        const origin = fetchMock.get(IMAGE_DELIVERY_SERVICE)

        origin
            .intercept({
                method: 'GET',
                path: `/${FAKE_IMAGE_HASH}/1/public`, // user 1, public image variant
            })
            .reply(400, 'Could not fetch the image')

        const result = await worker.fetch(
            ...generateRequest('user/1/avatar', 'GET', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )

        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Could not fetch the image')
    })

    // https://linear.app/hnt-labs/issue/HNT-7392/disabling-gateway-worker-post-requests
    test.skip('error post user avatar', async () => {
        const result = await worker.fetch(
            ...generateRequest(
                'user/1/avatar',
                'POST',
                {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${AUTH_TOKEN}`,
                },
                'id=1&file=',
            ),
        )

        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Invalid URL')
    })
})
