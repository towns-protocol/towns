/**
 * @group main
 */

import { Err, InfoRequest, InfoResponse } from '@river-build/proto'
import { makeTestRpcClient } from '../testUtils'
import { DEFAULT_RETRY_PARAMS, errorContains } from '../../rpcInterceptors'
import { makeRiverRpcClient } from '../../makeRiverRpcClient'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { makeRiverChainConfig } from '../../riverConfig'

describe('protocol 1', () => {
    test('info using makeStreamRpcClient', async () => {
        const client = await makeTestRpcClient()
        expect(client).toBeDefined()

        const response: InfoResponse = await client.info(new InfoRequest({}), {
            timeoutMs: 10000,
        })
        expect(response).toBeDefined()
        expect(response.graffiti).toEqual('River Node welcomes you!')
    })

    test('info-error using makeStreamRpcClient', async () => {
        const client = await makeTestRpcClient()
        expect(client).toBeDefined()

        try {
            await client.info(new InfoRequest({ debug: ['error'] }))
            expect(true).toBe(false)
        } catch (err) {
            expect(errorContains(err, Err.DEBUG_ERROR)).toBe(true)
        }
    })

    test('timeout using makeStreamRpcClient', async () => {
        // model some interesting behavior
        // see two retires time out locally in the retryInterceptor
        // and a third retry that times out when the global timeout passed to the .info request is reached
        const client = await makeTestRpcClient({
            retryParams: {
                ...DEFAULT_RETRY_PARAMS,
                initialRetryDelay: 10,
                maxRetryDelay: 30,
                defaultTimeoutMs: 1000,
            },
        })
        expect(client).toBeDefined()

        await client.info(new InfoRequest({ debug: ['ping'] }))

        await expect(
            client.info(new InfoRequest({ debug: ['sleep'] }), { timeoutMs: 2500 }),
        ).rejects.toThrow()
    })

    describe('protocol 2', () => {
        let provider: LocalhostWeb3Provider
        let riverConfig: ReturnType<typeof makeRiverChainConfig>

        beforeAll(async () => {
            riverConfig = makeRiverChainConfig()
            provider = new LocalhostWeb3Provider(riverConfig.rpcUrl)
        })

        test('info using makeRiverRpcClient', async () => {
            const client = await makeRiverRpcClient(provider, riverConfig.chainConfig)
            expect(client).toBeDefined()

            const response: InfoResponse = await client.info(new InfoRequest({}), {
                timeoutMs: 10000,
            })
            expect(response).toBeDefined()
            expect(response.graffiti).toEqual('River Node welcomes you!')
        })

        test('info-error using makeRiverRpcClient', async () => {
            const client = await makeRiverRpcClient(provider, riverConfig.chainConfig)
            expect(client).toBeDefined()

            try {
                await client.info(new InfoRequest({ debug: ['error'] }))
                expect(true).toBe(false)
            } catch (err) {
                expect(errorContains(err, Err.DEBUG_ERROR)).toBe(true)
            }
        })
    })
})
