/**
 * @group main
 */

import { describe, it, expect, vi } from 'vitest'
import { MockERC721AShim } from '../src/test-helpers/MockERC721AShim'
import { ethers } from 'ethers'

describe('BaseContractShim read method with retry logic', () => {
    const mockAddress = '0x1234567890123456789012345678901234567890'

    const createTestSetup = async () => {
        const provider = new ethers.providers.JsonRpcProvider(process.env.BASE_CHAIN_RPC_URL)
        const mockShim = new MockERC721AShim(mockAddress, provider)
        return { provider, mockShim }
    }

    describe.concurrent('retry functionality', () => {
        it('should succeed on first try when contract call works', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            // Mock the provider to return a successful response
            const spy = vi
                .spyOn(provider, 'call')
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000001',
                )

            const contract = mockShim.read
            const result = await contract.balanceOf(mockAddress)

            expect(result.toString()).toBe('1')
            expect(spy).toHaveBeenCalledTimes(1)
        })

        it('should retry on network failure and eventually succeed', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            // Mock provider to fail twice, then succeed
            const spy = vi
                .spyOn(provider, 'call')
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Timeout'))
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000005',
                )

            const contract = mockShim.read
            const result = await contract.balanceOf(mockAddress)

            expect(result.toString()).toBe('5')
            expect(spy).toHaveBeenCalledTimes(3)
        })

        it('should fail after max retry attempts', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            // Mock provider to always fail
            const spy = vi
                .spyOn(provider, 'call')
                .mockRejectedValue(new Error('Persistent network error'))

            const contract = mockShim.read

            await expect(contract.balanceOf(mockAddress)).rejects.toThrow(
                'Persistent network error',
            )
            expect(spy).toHaveBeenCalledTimes(4) // Initial + 3 retries
        })

        it('should work with callStatic methods', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            const spy = vi
                .spyOn(provider, 'call')
                .mockRejectedValueOnce(new Error('Static call error'))
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000001',
                )

            const contract = mockShim.read
            const result = await contract.callStatic.balanceOf(mockAddress)

            expect(result.toString()).toBe('1')
            expect(spy).toHaveBeenCalledTimes(2)
        })

        it('should handle different error types', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            const spy = vi
                .spyOn(provider, 'call')
                .mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'Network unreachable' })
                .mockRejectedValueOnce({ code: 'TIMEOUT', message: 'Request timeout' })
                .mockRejectedValueOnce(new Error('Generic error'))
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000003',
                )

            const contract = mockShim.read
            const result = await contract.balanceOf(mockAddress)

            expect(result.toString()).toBe('3')
            expect(spy).toHaveBeenCalledTimes(4)
        })

        it('should retry with delays (simplified timing test)', async () => {
            const { provider, mockShim } = await createTestSetup()
            await mockShim.getNetwork()

            // Test that retries happen with delays without getting into complex timer mocking
            const start = Date.now()
            const spy = vi
                .spyOn(provider, 'call')
                .mockRejectedValueOnce(new Error('Error 1'))
                .mockRejectedValueOnce(new Error('Error 2'))
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000002',
                )

            const contract = mockShim.read
            const result = await contract.balanceOf(mockAddress)
            const elapsed = Date.now() - start

            expect(result.toString()).toBe('2')
            expect(spy).toHaveBeenCalledTimes(3)
            // Should take at least 1000ms for the first retry delay, but allow for test timing variance
            expect(elapsed).toBeGreaterThan(500) // Be lenient for CI/test environments
        })

        it('should use non-retry on first call when network not resolved, then retry on second call', async () => {
            const { provider, mockShim } = await createTestSetup()

            // First call should fail immediately (no retry)
            const callSpy = vi
                .spyOn(provider, 'call')
                .mockRejectedValueOnce(new Error('First call fails'))

            // First call - should fail without retry because network not resolved
            await expect(mockShim.read.balanceOf(mockAddress)).rejects.toThrow('First call fails')
            expect(callSpy).toHaveBeenCalledTimes(1) // No retries

            // Wait for network to resolve
            await new Promise((resolve) => setTimeout(resolve, 1_000))

            // Reset mock for second call
            callSpy.mockClear()
            callSpy
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Another error'))
                .mockResolvedValueOnce(
                    '0x0000000000000000000000000000000000000000000000000000000000000002',
                )

            // Second call - should retry because network is now resolved
            const result = await mockShim.read.balanceOf(mockAddress)
            expect(result.toString()).toBe('2')
            expect(callSpy).toHaveBeenCalledTimes(3) // Initial + 2 retries
        })
    })
})
