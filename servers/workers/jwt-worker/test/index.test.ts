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

    test('pass /register route', async () => {
        const result = await worker.fetch(
            ...generateRequest('register', 'POST', {
                Authorization: `Bearer ${AUTH_TOKEN}`,
            }),
        )

        expect(result.status).toBe(200)

        const text = await result.text()
        expect(text).toBe('Ok')
    })
})
