/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Observable } from '../../../observable/observable'

describe('Observable', () => {
    describe('constructor and basic functionality', () => {
        it('should initialize with a value', () => {
            const obs = new Observable(5)
            expect(obs.value).toBe(5)
        })

        it('should handle different types of initial values', () => {
            const stringObs = new Observable('hello')
            const objectObs = new Observable({ key: 'value' })
            const arrayObs = new Observable([1, 2, 3])

            expect(stringObs.value).toBe('hello')
            expect(objectObs.value).toEqual({ key: 'value' })
            expect(arrayObs.value).toEqual([1, 2, 3])
        })
    })

    describe('setValue', () => {
        it('should update the value', () => {
            const obs = new Observable(5)
            obs.setValue(10)
            expect(obs.value).toBe(10)
        })

        it('should not trigger notifications when value is the same', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()
            obs.subscribe(subscriber)

            obs.setValue(5) // Same value
            expect(subscriber).not.toHaveBeenCalled()
        })

        it('should trigger notifications when value changes', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()
            obs.subscribe(subscriber)

            obs.setValue(10)
            expect(subscriber).toHaveBeenCalledWith(10, 5)
        })
    })

    describe('set', () => {
        it('should update value using a function', () => {
            const obs = new Observable(5)
            obs.set((prev) => prev * 2)
            expect(obs.value).toBe(10)
        })

        it('should trigger notifications when using set', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()
            obs.subscribe(subscriber)

            obs.set((prev) => prev + 1)
            expect(subscriber).toHaveBeenCalledWith(6, 5)
        })
    })

    describe('subscribe', () => {
        it('should call subscriber when value changes', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()
            obs.subscribe(subscriber)

            obs.setValue(10)
            expect(subscriber).toHaveBeenCalledWith(10, 5)
        })

        it('should call multiple subscribers', () => {
            const obs = new Observable(5)
            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()

            obs.subscribe(subscriber1)
            obs.subscribe(subscriber2)

            obs.setValue(10)
            expect(subscriber1).toHaveBeenCalledWith(10, 5)
            expect(subscriber2).toHaveBeenCalledWith(10, 5)
        })

        it('should fire immediately when fireImediately option is true', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            obs.subscribe(subscriber, { fireImediately: true })
            expect(subscriber).toHaveBeenCalledWith(5, 5)
        })

        it('should only fire once when once option is true', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            obs.subscribe(subscriber, { once: true })

            obs.setValue(10)
            obs.setValue(15)

            expect(subscriber).toHaveBeenCalledTimes(1)
            expect(subscriber).toHaveBeenCalledWith(10, 5)
        })

        it('should only fire when condition is met', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            obs.subscribe(subscriber, { condition: (value) => value > 10 })

            obs.setValue(8) // Should not fire
            obs.setValue(12) // Should fire
            obs.setValue(15) // Should fire

            expect(subscriber).toHaveBeenCalledTimes(2)
            expect(subscriber).toHaveBeenNthCalledWith(1, 12, 8)
            expect(subscriber).toHaveBeenNthCalledWith(2, 15, 12)
        })

        it('should combine once and condition options', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            obs.subscribe(subscriber, {
                once: true,
                condition: (value) => value > 10,
            })

            obs.setValue(8) // Should not fire
            obs.setValue(12) // Should fire once
            obs.setValue(15) // Should not fire (already fired once)

            expect(subscriber).toHaveBeenCalledTimes(1)
            expect(subscriber).toHaveBeenCalledWith(12, 8)
        })

        it('should return an unsubscribe function', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            const unsubscribe = obs.subscribe(subscriber)
            obs.setValue(10)
            expect(subscriber).toHaveBeenCalledTimes(1)

            unsubscribe()
            obs.setValue(15)
            expect(subscriber).toHaveBeenCalledTimes(1) // Should not be called again
        })
    })

    describe('unsubscribe', () => {
        it('should remove a specific subscriber', () => {
            const obs = new Observable(5)
            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()

            obs.subscribe(subscriber1)
            obs.subscribe(subscriber2)

            obs.unsubscribe(subscriber1)
            obs.setValue(10)

            expect(subscriber1).not.toHaveBeenCalled()
            expect(subscriber2).toHaveBeenCalledWith(10, 5)
        })

        it('should handle unsubscribing non-existent subscriber', () => {
            const obs = new Observable(5)
            const subscriber = vi.fn()

            // Should not throw error
            expect(() => obs.unsubscribe(subscriber)).not.toThrow()
        })
    })

    describe('when', () => {
        it('should resolve when condition is immediately met', async () => {
            const obs = new Observable(15)

            const result = await obs.when((value) => value > 10)
            expect(result).toBe(15)
        })

        it('should resolve when condition becomes true', async () => {
            const obs = new Observable(5)

            const promise = obs.when((value) => value > 10)

            setTimeout(() => obs.setValue(15), 10)

            const result = await promise
            expect(result).toBe(15)
        })

        it('should timeout when condition is not met', async () => {
            const obs = new Observable(5)

            await expect(
                obs.when((value) => value > 10, { timeoutMs: 50 }),
            ).rejects.toThrow('Timeout waiting for condition')
        })

        it('should include description in timeout error', async () => {
            const obs = new Observable(5)

            await expect(
                obs.when((value) => value > 10, {
                    timeoutMs: 50,
                    description: 'value to exceed 10',
                }),
            ).rejects.toThrow(
                'Timeout waiting for condition value to exceed 10',
            )
        })
    })

    describe('map', () => {
        it('should create a mapped observable', () => {
            const obs = new Observable(5)
            const mapped = obs.map((value) => ({ doubled: value * 2 }))

            expect(mapped.value).toEqual({ doubled: 10 })
        })

        it('should update mapped observable when source changes', () => {
            const obs = new Observable(5)
            const mapped = obs.map((value) => ({ doubled: value * 2 }))

            obs.setValue(10)
            expect(mapped.value).toEqual({ doubled: 20 })
        })

        it('should pass previous value and state to map function', () => {
            const obs = new Observable(5)
            const mapFn = vi.fn((value: any, prevValue: any, state: any) => ({
                current: value,
                previous: prevValue,
                count: (state?.count || 0) + 1,
            }))

            const mapped = obs.map(mapFn)

            expect(mapped.value).toEqual({
                current: 5,
                previous: 5,
                count: 1,
            })

            // Initial call
            expect(mapFn).toHaveBeenCalledWith(5, 5)

            obs.setValue(10)
            // Should be called with current state
            expect(mapFn).toHaveBeenLastCalledWith(10, 5, {
                current: 5,
                previous: 5,
                count: 1,
            })

            expect(mapped.value).toEqual({
                current: 10,
                previous: 5,
                count: 2,
            })
        })

        it('should dispose mapped observable correctly', () => {
            const obs = new Observable(5)
            const mapped = obs.map((value) => ({ doubled: value * 2 }))

            mapped.dispose()
            obs.setValue(10)

            // Mapped observable should not update after disposal
            expect(mapped.value).toEqual({ doubled: 10 })
        })
    })

    describe('throttle', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('should create a throttled observable with initial value', () => {
            const obs = new Observable(5)
            const throttled = obs.throttle(100)

            expect(throttled.value).toBe(5)
        })

        it('should throttle rapid value changes', () => {
            const obs = new Observable(5)
            const throttled = obs.throttle(100)
            const subscriber = vi.fn()

            throttled.subscribe(subscriber)

            obs.setValue(10)
            obs.setValue(15)
            obs.setValue(20)

            // Should not have updated yet
            expect(subscriber).not.toHaveBeenCalled()
            expect(throttled.value).toBe(5)

            // Fast forward time
            vi.advanceTimersByTime(100)

            // Should update with the last value
            expect(subscriber).toHaveBeenCalledWith(20, 5)
            expect(throttled.value).toBe(20)
        })

        it('should handle multiple throttle periods', () => {
            const obs = new Observable(5)
            const throttled = obs.throttle(100)

            obs.setValue(10)
            vi.advanceTimersByTime(100)
            expect(throttled.value).toBe(10)

            obs.setValue(20)
            obs.setValue(30)
            vi.advanceTimersByTime(100)
            expect(throttled.value).toBe(30)
        })

        it('should dispose throttled observable correctly', () => {
            const obs = new Observable(5)
            const throttled = obs.throttle(100)

            obs.setValue(10)
            throttled.dispose()

            // Should clear timeout and not update
            vi.advanceTimersByTime(100)
            expect(throttled.value).toBe(5)
        })
    })

    describe('dispose', () => {
        it('should clear all subscribers', () => {
            const obs = new Observable(5)
            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()

            obs.subscribe(subscriber1)
            obs.subscribe(subscriber2)

            obs.dispose()
            obs.setValue(10)

            expect(subscriber1).not.toHaveBeenCalled()
            expect(subscriber2).not.toHaveBeenCalled()
        })

        it('should call dispose function if set', () => {
            const obs = new Observable(5)
            const disposeFn = vi.fn()

            // Simulate setting _dispose (like map does)
            ;(obs as any)._dispose = disposeFn

            obs.dispose()
            expect(disposeFn).toHaveBeenCalled()
        })
    })

    describe('edge cases and error handling', () => {
        it('should handle undefined values', () => {
            const obs = new Observable<number | undefined>(undefined)
            expect(obs.value).toBeUndefined()

            const subscriber = vi.fn()
            obs.subscribe(subscriber)

            obs.setValue(5)
            expect(subscriber).toHaveBeenCalledWith(5, undefined)
        })

        it('should handle null values', () => {
            const obs = new Observable<number | null>(null)
            expect(obs.value).toBeNull()

            obs.setValue(5)
            expect(obs.value).toBe(5)
        })

        it('should handle complex object comparisons', () => {
            const obj1 = { a: 1 }
            const obj2 = { a: 1 }
            const obs = new Observable(obj1)
            const subscriber = vi.fn()

            obs.subscribe(subscriber)
            obs.setValue(obj2) // Different object reference but same content

            expect(subscriber).toHaveBeenCalledWith(obj2, obj1)
        })

        it('should handle subscription during notification', () => {
            const obs = new Observable(5)
            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()

            obs.subscribe((value) => {
                subscriber1(value)
                // Subscribe during notification
                obs.subscribe(subscriber2)
            })

            obs.setValue(10)
            obs.setValue(15)

            expect(subscriber1).toHaveBeenCalledTimes(2)
            expect(subscriber2).toHaveBeenCalledTimes(1) // Only called for second setValue
        })
    })
})
