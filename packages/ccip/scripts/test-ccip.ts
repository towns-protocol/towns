#!/usr/bin/env bun
/**
 * Manual test script for the CCIP-read gateway.
 * Usage: bun scripts/test-ccip.ts [name] [chainId]
 *
 * Examples:
 *   bun scripts/test-ccip.ts                      # Uses defaults
 *   bun scripts/test-ccip.ts alice.towns.eth      # Test specific name
 *   bun scripts/test-ccip.ts alice.towns.eth 84532 # Test on Base Sepolia
 */
import { encodeFunctionData, namehash, toHex } from 'viem'
import { packetToBytes } from 'viem/ens'
import { il1ResolverServiceAbi, iAddrResolverAbi } from '../src/generated'

const SERVER_URL = process.env.SERVER_URL ?? 'http://localhost:8787'

// Defaults - customize these for your test
const name = process.argv[2] ?? 'alice.towns-dev.eth'
const chainId = BigInt(process.argv[3] ?? '84532') // Base Sepolia
const sender = '0x8A968aB9eb8C084FBC44c531058Fc9ef945c3D61' // L1 resolver address
const registry = '0xaa864d13d357a735e2aec4236bd730cf65c11dac' // L2 registry

async function main() {
    console.log('🔍 Testing CCIP-read gateway\n')
    console.log(`  Name:     ${name}`)
    console.log(`  Chain ID: ${chainId}`)
    console.log(`  Sender:   ${sender}`)
    console.log(`  Registry: ${registry}\n`)

    // Encode the DNS name
    const dnsEncodedName = toHex(packetToBytes(name))

    // Encode an inner resolve call (addr(bytes32) for address resolution)
    const innerCall = encodeFunctionData({
        abi: iAddrResolverAbi,
        functionName: 'addr',
        args: [namehash(name)],
    })

    // Encode the stuffed resolve call
    const stuffedCalldata = encodeFunctionData({
        abi: il1ResolverServiceAbi,
        functionName: 'stuffedResolveCall',
        args: [dnsEncodedName, innerCall, chainId, registry],
    })

    const url = `${SERVER_URL}/v1/ccip-read/${sender}/${stuffedCalldata}`

    console.log('📡 Request URL:')
    console.log(`  ${url.slice(0, 80)}...`)
    console.log()

    try {
        const res = await fetch(url)
        if (!res.ok) {
            console.error(`❌ HTTP Error ${res.status}: ${res.statusText}`)
            const text = await res.text()
            console.error(text)
            return
        }
        const body = await res.json()
        console.log(`📥 Response (${res.status}):`)
        console.log(JSON.stringify(body, null, 2))
    } catch (error) {
        console.error('❌ Error:', error)
    }
}

main()
