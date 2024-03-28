/**
 * @group main
 */

import { Err, InfoRequest, InfoResponse } from '@river-build/proto'
import { makeTestRpcClient, RIVER_ANVIL } from './util.test'
import { errorContains } from './makeStreamRpcClient'
import { makeRiverRpcClient } from './makeRiverRpcClient'
import { LocalhostWeb3Provider } from '@river-build/web3'
import { ethers } from 'ethers'

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

    describe('protocol 2', () => {
        let provider: LocalhostWeb3Provider
        let chainId: number

        beforeAll(async () => {
            const wallet = ethers.Wallet.createRandom()
            provider = new LocalhostWeb3Provider(wallet, RIVER_ANVIL)
            chainId = (await provider.getNetwork()).chainId
        })

        test('info using makeRiverRpcClient', async () => {
            const client = await makeRiverRpcClient({ chainId, provider })
            expect(client).toBeDefined()

            const response: InfoResponse = await client.info(new InfoRequest({}), {
                timeoutMs: 10000,
            })
            expect(response).toBeDefined()
            expect(response.graffiti).toEqual('River Node welcomes you!')
        })

        test('info-error using makeRiverRpcClient', async () => {
            const client = await makeRiverRpcClient({ chainId, provider })
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
