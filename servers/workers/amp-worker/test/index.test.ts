import worker from '../src/index'

const FAKE_SERVER_URL = 'http://localhost'

describe('amp-worker handler', () => {
    test('return response from upstream unmodified', async () => {
        const url = `${FAKE_SERVER_URL}${'/'}`
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api2.amplitude.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'POST', path: '/2/httpapi' }).reply(200, 'Mocked response!')
        const request = new Request<unknown, IncomingRequestCfProperties>(url, {
            method: 'POST',
            headers: {},
            body: JSON.stringify({
                api_key: 'fakekey',
            }),
        })
        const result = await worker.fetch?.(request, getMiniflareBindings(), {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            waitUntil: function (promise: Promise<unknown>): void {
                throw new Error('Function not implemented.')
            },
            passThroughOnException: function (): void {
                throw new Error('Function not implemented.')
            },
        })

        const text = await result?.text()
        expect(text).toContain('Mocked response!')
        expect(result?.status).toBe(200)
    })
    test('return 500 response from upstream 500', async () => {
        const url = `${FAKE_SERVER_URL}${'/'}`
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api2.amplitude.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'POST', path: '/2/httpapi' }).reply(() => {
            throw new Error('Mock something bad happened!')
        })
        const request = new Request<unknown, IncomingRequestCfProperties>(url, {
            method: 'POST',
            headers: {},
            body: JSON.stringify({
                api_key: 'fakekey',
            }),
        })
        const result = await worker.fetch?.(request, getMiniflareBindings(), {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            waitUntil: function (promise: Promise<unknown>): void {
                throw new Error('Function not implemented.')
            },
            passThroughOnException: function (): void {
                throw new Error('Function not implemented.')
            },
        })

        expect(result?.status).toBe(500)
        expect(await result?.text()).toContain('Internal Server Error')
    })

    test('return 200 response to health request', async () => {
        const url = `${FAKE_SERVER_URL}${'/health'}`
        const request = new Request<unknown, IncomingRequestCfProperties>(url, {
            method: 'GET',
            headers: {},
        })
        const result = await worker.fetch?.(request, getMiniflareBindings(), {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            waitUntil: function (promise: Promise<unknown>): void {
                throw new Error('Function not implemented.')
            },
            passThroughOnException: function (): void {
                throw new Error('Function not implemented.')
            },
        })

        expect(result?.status).toBe(200)
        expect(await result?.text()).toContain('OK')
    })

    test('returns options', async () => {
        const url = `${FAKE_SERVER_URL}${'/'}`
        const request = new Request<unknown, IncomingRequestCfProperties>(url, {
            method: 'OPTIONS',
            headers: {},
            body: JSON.stringify({
                api_key: 'fakekey',
            }),
        })
        const result = await worker.fetch?.(request, getMiniflareBindings(), {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            waitUntil: function (promise: Promise<unknown>): void {
                throw new Error('Function not implemented.')
            },
            passThroughOnException: function (): void {
                throw new Error('Function not implemented.')
            },
        })

        expect(result?.status).toBe(204)
        const text = await result?.text()
        expect(text).toContain('')
        console.log(result?.headers.get('Access-Control-Allow-Origin'))
        expect(result?.headers.get('Access-Control-Allow-Origin')).toBe('')
    })
})
