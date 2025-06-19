/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { describe, it, expect, vi } from 'vitest'
import { Observable } from '../../../observable/observable'
import { combine } from '../../../observable/combine'

describe('Combine', () => {
    describe('constructor and basic functionality', () => {
        it('should initialize with combined values from input observables', () => {
            const nameObs = new Observable('John')
            const ageObs = new Observable(25)
            const isActiveObs = new Observable(true)

            const combined = combine({
                name: nameObs,
                age: ageObs,
                isActive: isActiveObs,
            })

            expect(combined.value).toEqual({
                name: 'John',
                age: 25,
                isActive: true,
            })
        })

        it('should handle different types of observables', () => {
            const stringObs = new Observable('hello')
            const numberObs = new Observable(42)
            const objectObs = new Observable({ key: 'value' })
            const arrayObs = new Observable([1, 2, 3])

            const combined = combine({
                str: stringObs,
                num: numberObs,
                obj: objectObs,
                arr: arrayObs,
            })

            expect(combined.value).toEqual({
                str: 'hello',
                num: 42,
                obj: { key: 'value' },
                arr: [1, 2, 3],
            })
        })

        it('should handle single observable', () => {
            const obs = new Observable('single')
            const combined = combine({ single: obs })

            expect(combined.value).toEqual({ single: 'single' })
        })

        it('should handle empty object of observables', () => {
            const combined = combine({})
            expect(combined.value).toEqual({})
        })
    })

    describe('value updates', () => {
        it('should update combined value when any input observable changes', () => {
            const nameObs = new Observable('John')
            const ageObs = new Observable(25)

            const combined = combine({
                name: nameObs,
                age: ageObs,
            })

            // Change name
            nameObs.setValue('Jane')
            expect(combined.value).toEqual({
                name: 'Jane',
                age: 25,
            })

            // Change age
            ageObs.setValue(30)
            expect(combined.value).toEqual({
                name: 'Jane',
                age: 30,
            })
        })

        it('should trigger subscribers when any input observable changes', () => {
            const nameObs = new Observable('John')
            const ageObs = new Observable(25)

            const combined = combine({
                name: nameObs,
                age: ageObs,
            })

            const subscriber = vi.fn()
            combined.subscribe(subscriber)

            const expectedOld = { name: 'John', age: 25 }
            const expectedNew = { name: 'Jane', age: 25 }

            nameObs.setValue('Jane')
            expect(subscriber).toHaveBeenCalledWith(expectedNew, expectedOld)
        })

        it('should not trigger when input observable value does not change', () => {
            const nameObs = new Observable('John')
            const ageObs = new Observable(25)

            const combined = combine({
                name: nameObs,
                age: ageObs,
            })

            const subscriber = vi.fn()
            combined.subscribe(subscriber)

            // Set same value
            nameObs.setValue('John')
            expect(subscriber).not.toHaveBeenCalled()
        })

        it('should handle multiple rapid changes', () => {
            const obs1 = new Observable(1)
            const obs2 = new Observable(2)

            const combined = combine({
                a: obs1,
                b: obs2,
            })

            const subscriber = vi.fn()
            combined.subscribe(subscriber)

            obs1.setValue(10)
            obs2.setValue(20)
            obs1.setValue(100)

            expect(subscriber).toHaveBeenCalledTimes(3)
            expect(combined.value).toEqual({ a: 100, b: 20 })
        })
    })

    describe('subscription behavior', () => {
        it('should call multiple subscribers when values change', () => {
            const obs = new Observable('test')
            const combined = combine({ value: obs })

            const subscriber1 = vi.fn()
            const subscriber2 = vi.fn()

            combined.subscribe(subscriber1)
            combined.subscribe(subscriber2)

            obs.setValue('changed')

            expect(subscriber1).toHaveBeenCalledWith({ value: 'changed' }, { value: 'test' })
            expect(subscriber2).toHaveBeenCalledWith({ value: 'changed' }, { value: 'test' })
        })

        it('should support subscription options', () => {
            const obs = new Observable(5)
            const combined = combine({ num: obs })

            const subscriber = vi.fn()
            combined.subscribe(subscriber, { fireImediately: true })

            expect(subscriber).toHaveBeenCalledWith({ num: 5 }, { num: 5 })
        })

        it('should support conditional subscriptions', () => {
            const obs = new Observable(5)
            const combined = combine({ num: obs })

            const subscriber = vi.fn()
            combined.subscribe(subscriber, {
                condition: (value) => value.num > 10,
            })

            obs.setValue(8) // Should not fire
            obs.setValue(15) // Should fire

            expect(subscriber).toHaveBeenCalledTimes(1)
            expect(subscriber).toHaveBeenCalledWith({ num: 15 }, { num: 8 })
        })

        it('should return unsubscribe function', () => {
            const obs = new Observable('test')
            const combined = combine({ value: obs })

            const subscriber = vi.fn()
            const unsubscribe = combined.subscribe(subscriber)

            obs.setValue('changed1')
            expect(subscriber).toHaveBeenCalledTimes(1)

            unsubscribe()
            obs.setValue('changed2')
            expect(subscriber).toHaveBeenCalledTimes(1) // Should not be called again
        })
    })

    describe('disposal', () => {
        it('should dispose all input observable subscriptions', () => {
            const obs1 = new Observable(1)
            const obs2 = new Observable(2)

            const combined = combine({
                a: obs1,
                b: obs2,
            })

            const subscriber = vi.fn()
            combined.subscribe(subscriber)

            combined.dispose()

            // Changes to input observables should not affect combined observable
            obs1.setValue(10)
            obs2.setValue(20)

            expect(subscriber).not.toHaveBeenCalled()
            // Combined value should remain unchanged after disposal
            expect(combined.value).toEqual({ a: 1, b: 2 })
        })

        it('should handle multiple dispose calls', () => {
            const obs = new Observable('test')
            const combined = combine({ value: obs })

            // Should not throw error
            expect(() => {
                combined.dispose()
                combined.dispose()
            }).not.toThrow()
        })

        it('should clear internal unsubscribers array', () => {
            const obs1 = new Observable(1)
            const obs2 = new Observable(2)

            const combined = combine({
                a: obs1,
                b: obs2,
            })

            combined.dispose()

            // Access private property to verify cleanup
            expect((combined as any).unsubscribers).toEqual([])
        })
    })

    describe('inheritance from Observable', () => {
        it('should support Observable methods like map', () => {
            const obs = new Observable(5)
            const combined = combine({ num: obs })

            const mapped = combined.map((value) => ({
                doubled: value.num * 2,
            }))

            expect(mapped.value).toEqual({ doubled: 10 })

            obs.setValue(10)
            expect(mapped.value).toEqual({ doubled: 20 })
        })

        it('should support Observable methods like when', async () => {
            const obs = new Observable(5)
            const combined = combine({ num: obs })

            const promise = combined.when((value) => value.num > 10)

            setTimeout(() => obs.setValue(15), 10)

            const result = await promise
            expect(result).toEqual({ num: 15 })
        })

        it('should support setValue and set methods', () => {
            const obs = new Observable(5)
            const combined = combine({ num: obs })

            const subscriber = vi.fn()
            combined.subscribe(subscriber)

            // Use setValue directly on combined observable
            combined.setValue({ num: 100 })
            expect(combined.value).toEqual({ num: 100 })
            expect(subscriber).toHaveBeenCalledWith({ num: 100 }, { num: 5 })

            // Use set method
            combined.set((prev) => ({ num: prev.num + 50 }))
            expect(combined.value).toEqual({ num: 150 })
        })
    })

    describe('edge cases and error handling', () => {
        it('should handle observables with undefined values', () => {
            const obs1 = new Observable<string | undefined>(undefined)
            const obs2 = new Observable<number | undefined>(undefined)

            const combined = combine({
                str: obs1,
                num: obs2,
            })

            expect(combined.value).toEqual({
                str: undefined,
                num: undefined,
            })

            obs1.setValue('defined')
            expect(combined.value).toEqual({
                str: 'defined',
                num: undefined,
            })
        })

        it('should handle observables with null values', () => {
            const obs = new Observable<string | null>(null)
            const combined = combine({ value: obs })

            expect(combined.value).toEqual({ value: null })

            obs.setValue('not null')
            expect(combined.value).toEqual({ value: 'not null' })
        })

        it('should handle complex nested objects', () => {
            const userObs = new Observable({ name: 'John', details: { age: 25 } })
            const settingsObs = new Observable({ theme: 'dark', notifications: true })

            const combined = combine({
                user: userObs,
                settings: settingsObs,
            })

            expect(combined.value).toEqual({
                user: { name: 'John', details: { age: 25 } },
                settings: { theme: 'dark', notifications: true },
            })

            userObs.setValue({ name: 'Jane', details: { age: 30 } })
            expect(combined.value.user).toEqual({ name: 'Jane', details: { age: 30 } })
        })

        it('should maintain key order from input observables', () => {
            const obs1 = new Observable(1)
            const obs2 = new Observable(2)
            const obs3 = new Observable(3)

            const combined = combine({
                z: obs3,
                a: obs1,
                m: obs2,
            })

            const keys = Object.keys(combined.value)
            expect(keys).toEqual(['z', 'a', 'm'])
        })
    })
})
