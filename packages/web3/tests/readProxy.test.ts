import { Contract } from 'ethers'
import { createReadRetryProxy } from '../src/BaseContractShim'
import { describe, it, expect, vi } from 'vitest'

describe('createReadRetryProxy', () => {
    it('should copy all regular properties', () => {
        const mockContract = {
            address: '0x123',
            interface: { events: [] },
            regularProperty: 'test-value',
            regularMethod: async () => 'success',
        }

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        expect(proxy.address).toBe('0x123')
        expect(proxy.regularProperty).toBe('test-value')
        expect(proxy.interface.events).toEqual([])
    })

    it('should handle non-configurable properties', async () => {
        const mockContract = {
            regularProp: 'value',
            nonConfigMethod: async () => 'non-config-success',
        }

        // Make property non-configurable
        Object.defineProperty(mockContract, 'nonConfigMethod', {
            value: mockContract.nonConfigMethod,
            writable: false,
            enumerable: true,
            configurable: false,
        })

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        expect(typeof proxy.nonConfigMethod).toBe('function')
        const result = await proxy.nonConfigMethod()
        expect(result).toBe('non-config-success')
    })

    it('should return correct values for successful method calls', async () => {
        const mockContract = {
            successMethod: async () => 'method-success',
            getValue: async (input: string) => `processed-${input}`,
        }

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        const result1 = await proxy.successMethod()
        expect(result1).toBe('method-success')

        const result2 = await proxy.getValue('test')
        expect(result2).toBe('processed-test')
    })

    it('should retry failed calls and eventually succeed', async () => {
        vi.useFakeTimers()

        let callCount = 0
        const mockContract = {
            failingMethod: async () => {
                callCount++
                if (callCount < 3) {
                    throw new Error('Network error')
                }
                return 'finally-success'
            },
        }

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        // Start the method call
        const resultPromise = proxy.failingMethod()

        // Fast-forward through retry delays: 500ms, 1000ms
        await vi.advanceTimersByTimeAsync(500) // First retry
        await vi.advanceTimersByTimeAsync(1000) // Second retry

        const result = await resultPromise
        expect(result).toBe('finally-success')
        expect(callCount).toBe(3)

        vi.useRealTimers()
    })

    it('should copy properties from base and extended classes', async () => {
        class BaseContract {
            baseProperty = 'base-value'
            async baseMethod() {
                return 'base-method-result'
            }
        }

        class ExtendedContract extends BaseContract {
            extendedProperty = 'extended-value'
            async extendedMethod() {
                return 'extended-method-result'
            }
        }

        const contract = new ExtendedContract()
        const proxy = createReadRetryProxy(contract as unknown as Contract)

        expect(proxy.baseProperty).toBe('base-value')
        expect(proxy.extendedProperty).toBe('extended-value')

        const baseResult = await proxy.baseMethod()
        expect(baseResult).toBe('base-method-result')

        const extendedResult = await proxy.extendedMethod()
        expect(extendedResult).toBe('extended-method-result')
    })

    it('should not wrap non-function properties with retry logic', async () => {
        const mockContract = {
            stringProp: 'string-value',
            numberProp: 42,
            objectProp: { nested: 'value' },
            asyncMethod: async () => 'async-result',
        }

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        // Non-functions should be direct references
        expect(proxy.stringProp).toBe(mockContract.stringProp)
        expect(proxy.numberProp).toBe(mockContract.numberProp)
        expect(proxy.objectProp).toBe(mockContract.objectProp)

        // Functions should be wrapped (different reference)
        expect(proxy.asyncMethod).not.toBe(mockContract.asyncMethod)
        const result = await proxy.asyncMethod()
        expect(result).toBe('async-result')
    })

    it('should use the configured retry timing (500ms base, up to 8s)', async () => {
        vi.useFakeTimers()

        const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
        let callCount = 0

        const mockContract = {
            slowFailingMethod: async () => {
                callCount++
                if (callCount < 5) {
                    // Will fail 4 times, succeed on 5th
                    throw new Error('Network timeout')
                }
                return 'success-after-retries'
            },
        }

        const proxy = createReadRetryProxy(mockContract as unknown as Contract)

        // Start the method call
        const resultPromise = proxy.slowFailingMethod()

        // Fast-forward through all retry delays
        // Expected sequence: 500ms, 1000ms, 2000ms, 4000ms
        await vi.advanceTimersByTimeAsync(500) // First retry
        await vi.advanceTimersByTimeAsync(1000) // Second retry
        await vi.advanceTimersByTimeAsync(2000) // Third retry
        await vi.advanceTimersByTimeAsync(4000) // Fourth retry

        const result = await resultPromise

        expect(result).toBe('success-after-retries')
        expect(callCount).toBe(5)

        mockConsoleLog.mockRestore()
        vi.useRealTimers()
    })

    it('should handle errors in property copying gracefully', () => {
        const problematicContract = Object.create(null) as {
            goodProperty: string
        } & Contract

        // Define a property that throws when accessed
        Object.defineProperty(problematicContract, 'problematicProperty', {
            get() {
                throw new Error('Property access error')
            },
            enumerable: true,
            configurable: true,
        })

        problematicContract.goodProperty = 'good-value'

        // Should not throw, should skip problematic properties
        expect(() => createReadRetryProxy(problematicContract)).not.toThrow()

        const proxy = createReadRetryProxy(problematicContract)
        expect(proxy.goodProperty).toBe('good-value')
    })
})
