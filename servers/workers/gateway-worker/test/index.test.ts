import { Env, worker } from '../src/index'

const FAKE_SERVER_URL = 'http://fakeserver.com'
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

    // skip until the worker is mocked
    test.skip('error get user avatar', async () => {
        const result = await worker.fetch(
            ...generateRequest('user/1/avatar', 'GET', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )

        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('Could not fetch the image')
    })

    test('error post user avatar', async () => {
        const result = await worker.fetch(
            ...generateRequest('user/1/avatar', 'POST', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )

        expect(result.status).toBe(400)

        const text = await result.text()
        expect(text).toContain('invalid cookie')
    })
})
