import { describe, expect, test, beforeAll } from 'bun:test'
import { decodeAbiParameters, decodeFunctionData, encodeFunctionData, namehash, toHex } from 'viem'
import { packetToBytes } from 'viem/ens'

import app from './index'
import { iAddrResolverAbi, il1ResolverServiceAbi } from './abi'

// Test constants - replace with real values for E2E testing
const TEST_SENDER = '0xDB34Da70Cfd694190742E94B7f17769Bc3d84D27' //

// Real test data from OffchainLookup error
const REAL_CCIP_DATA = {
    sender: '0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61',
    callData:
        '0x21759430000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000014a34000000000000000000000000aa864d13d357a735e2aec4236bd730cf65c11dac000000000000000000000000000000000000000000000000000000000000001b0b676975736570706563726a09746f776e732d6465760365746800000000000000000000000000000000000000000000000000000000000000000000000000243b3b57de9ab0c9977e93b77afdf9fe57049c153a06a651fdfdc30104d11ed45e8d0d239b00000000000000000000000000000000000000000000000000000000',
    expectedAddress: '0x7960ed9f35954f60AdeeD98f0ab5c17664A29760',
} as const

describe('CCIP-Read Gateway', () => {
    test('GET / returns ok', async () => {
        const res = await app.request('/')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ status: 'ok' })
    })

    test('GET /health returns ok', async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)
        expect(await res.json()).toEqual({ status: 'ok' })
    })

    test('GET /v1/ccip-read/:sender/:data returns 400 for invalid sender', async () => {
        const res = await app.request('/v1/ccip-read/invalid/0x1234')
        expect(res.status).toBe(400)
        const json = await res.json()
        expect(json.message).toBe('Invalid request')
    })

    test('GET /v1/ccip-read/:sender/:data returns 400 for invalid data', async () => {
        const res = await app.request(`/v1/ccip-read/${TEST_SENDER}/not-hex`)
        expect(res.status).toBe(400)
    })

    test('decodes real CCIP calldata correctly', () => {
        // Verify we can decode the stuffed resolve call
        const decoded = decodeFunctionData({
            abi: il1ResolverServiceAbi,
            data: REAL_CCIP_DATA.callData,
        })

        expect(decoded.functionName).toBe('stuffedResolveCall')

        const [dnsEncodedName, innerCall, chainId, registry] = decoded.args

        // Verify chain ID is Base Sepolia (84532)
        expect(chainId).toBe(84532n)
        // Verify L2 registry address
        expect(registry.toLowerCase()).toBe('0xaa864d13d357a735e2aec4236bd730cf65c11dac')

        // Decode the inner resolver call using iAddrResolverAbi
        const innerDecoded = decodeFunctionData({
            abi: iAddrResolverAbi,
            data: innerCall,
        })

        expect(innerDecoded.functionName).toBe('addr')
        // The arg is the namehash of giuseppecrj.towns-dev.eth
        expect(innerDecoded.args[0]).toBe(
            '0x9ab0c9977e93b77afdf9fe57049c153a06a651fdfdc30104d11ed45e8d0d239b',
        )
    })

    test('resolves address via CCIP-read and returns signed response', async () => {
        // Skip if no ALCHEMY_API_KEY (required for L2 calls)
        if (!process.env.ALCHEMY_API_KEY) {
            console.log('Skipping E2E test: ALCHEMY_API_KEY not set')
            return
        }

        const url = `/v1/ccip-read/${REAL_CCIP_DATA.sender}/${REAL_CCIP_DATA.callData}`

        const res = await app.request(url, undefined, {
            ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY,
            SIGNER_PRIVATE_KEY:
                process.env.SIGNER_PRIVATE_KEY ??
                '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        })

        expect(res.status).toBe(200)

        const body = (await res.json()) as { data: `0x${string}` }
        expect(body.data).toBeDefined()

        // Decode the CCIP response: (bytes result, uint64 expires, bytes sig)
        const [result, expires, sig] = decodeAbiParameters(
            [
                { name: 'result', type: 'bytes' },
                { name: 'expires', type: 'uint64' },
                { name: 'sig', type: 'bytes' },
            ],
            body.data,
        )

        // Result is ABI-encoded address from addr(bytes32) call
        const [resolvedAddress] = decodeAbiParameters([{ name: 'addr', type: 'address' }], result)

        expect(resolvedAddress.toLowerCase()).toBe(REAL_CCIP_DATA.expectedAddress.toLowerCase())
        expect(expires).toBeGreaterThan(BigInt(Math.floor(Date.now() / 1000)))
        expect(sig.length).toBe(132) // 65 bytes = 130 hex chars + 0x
    })
})
