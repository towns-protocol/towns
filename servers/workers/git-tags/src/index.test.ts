import { unstable_dev } from 'wrangler'
import { describe, expect, it } from 'vitest'
import { MiniflareEnvironmentUtilities } from '@miniflare/shared-test-environment'

import worker, { Env } from './index'
import { TagsUrl } from './const'

declare global {
    function getMiniflareFetchMock(): ReturnType<
        MiniflareEnvironmentUtilities['getMiniflareFetchMock']
    >
    function getMiniflareBindings(): Env
}

/**
 * Tests that the exported fetch function deploys and is callable. Simply to make sure
 * that the worker is valid.
 */
describe('Wrangler', () => {
    it('should return Hello World', async () => {
        const worker = await unstable_dev('src/index.ts', {
            experimental: { disableExperimentalWarning: true },
        })

        const resp = await worker.fetch('/status')
        if (resp) {
            const text = await resp.text()
            expect(resp.status).toBe(200)
            expect(text).toMatchInlineSnapshot('"OK"')
        }
        await worker.stop()
    })
})

/**
 * There tests all use the `MiniflareEnvironmentUtilities` to mock the Github environment
 * and test the worker in isolation.
 */
describe('Mocks', () => {
    it('mocks fetch', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(
            200,
            `[
              {
                "name": "1.0.7",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd7"
                }
              },
              {
                "name": "1.0.8",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              }
            ]`,
        )

        const request = new Request<unknown, IncomingRequestCfProperties>(new URL(TagsUrl), {
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

        expect(result?.status).toBe(400)
        expect(await result?.text()).toContain('sha param not found')
    })

    it('one hash, one tag', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(
            200,
            `[
              {
                "name": "1.0.7",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd7"
                }
              },
              {
                "name": "1.0.8",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              },
              {
                "name": "1.0.9",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              }

            ]`,
        )

        const request = new Request<unknown, IncomingRequestCfProperties>(
            new URL(TagsUrl + '?sha=e2621a3447aa48d50ccfec827e8d5e4987b21fd7'),
            {
                method: 'GET',
                headers: {},
            },
        )

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
        expect(await result?.text()).toContain('{"tag":["1.0.7"]}')
    })

    it('one hash, not found', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(
            200,
            `[
              {
                "name": "1.0.7",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd7"
                }
              },
              {
                "name": "1.0.8",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              },
              {
                "name": "1.0.9",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              }

            ]`,
        )

        const request = new Request<unknown, IncomingRequestCfProperties>(
            new URL(TagsUrl + '?sha=e2621a3447aa4'),
            {
                method: 'GET',
                headers: {},
            },
        )

        const result = await worker.fetch?.(request, getMiniflareBindings(), {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            waitUntil: function (promise: Promise<unknown>): void {
                throw new Error('Function not implemented.')
            },
            passThroughOnException: function (): void {
                throw new Error('Function not implemented.')
            },
        })

        expect(result?.status).toBe(400)
        expect(await result?.text()).toContain('sha not found')
    })

    it('one hash, two tags', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(
            200,
            `[
              {
                "name": "1.0.7",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd7"
                }
              },
              {
                "name": "1.0.8",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              },
              {
                "name": "1.0.9",
                "commit": {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              }

            ]`,
        )

        const request = new Request<unknown, IncomingRequestCfProperties>(
            new URL(TagsUrl + '?sha=e2621a3447aa48d50ccfec827e8d5e4987b21fd8'),
            {
                method: 'GET',
                headers: {},
            },
        )

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
        expect(await result?.text()).toContain('{"tag":["1.0.8","1.0.9"]}')
    })

    it('invalid jason from Github', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(
            200,
            `[
              {
                  "sha": "e2621a3447aa48d50ccfec827e8d5e4987b21fd8"
                }
              }

            ]`,
        )

        const request = new Request<unknown, IncomingRequestCfProperties>(
            new URL(TagsUrl + '?sha=e2621a3447aa48d50ccfec827e8d5e4987b21fd8'),
            {
                method: 'GET',
                headers: {},
            },
        )

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

    it('404 from Github', async () => {
        // Get correctly set up `MockAgent`
        const fetchMock = getMiniflareFetchMock()

        // Throw when no matching mocked request is found
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentdisablenetconnect)
        fetchMock.disableNetConnect()

        // Mock request to https://example.com/thing
        // (see https://undici.nodejs.org/#/docs/api/MockAgent?id=mockagentgetorigin)
        const origin = fetchMock.get('https://api.github.com')
        // (see https://undici.nodejs.org/#/docs/api/MockPool?id=mockpoolinterceptoptions)
        origin.intercept({ method: 'GET', path: '/repos/HereNotThere/harmony/tags' }).reply(404)

        const request = new Request<unknown, IncomingRequestCfProperties>(
            new URL(TagsUrl + '?sha=e2621a3447aa48d50ccfec827e8d5e4987b21fd8'),
            {
                method: 'GET',
                headers: {},
            },
        )

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
})
