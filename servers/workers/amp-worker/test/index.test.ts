import { Env, worker } from '../src/index'

const FAKE_SERVER_URL = 'http://localhost'

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

describe('amp-worker handler', () => {
    test('return response from upstream unmodified', async () => {
        const result = await worker.fetch(
            ...generateRequest(
                '/',
                'POST',
                JSON.stringify({
                    api_key: 'fakekey',
                }) as BodyInit,
            ),
        )

        expect(result.status).toBe(400)
        const text = await result.text()
        expect(text).toContain('Missing request body')
    })
})
