import { renderHook } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

import { usePersistOrder } from './usePersistOrder'

describe('usePersistOrder without sorting', () => {
    const setup = () =>
        renderHook(<T,>({ value }: { value: T[] }) => usePersistOrder(value), {
            initialProps: { value: [3, 2, 1] },
        })

    test('initial values, no sorting', async () => {
        const { result } = setup()
        expect(result.current).toEqual([3, 2, 1])
    })

    test('insert a value', async () => {
        const { result, rerender } = setup()

        rerender({ value: [3, 5, 2, 1] })
        expect(result.current).toEqual([3, 5, 2, 1])
    })

    test('shuffle values and insert a new', async () => {
        const { result, rerender } = setup()
        rerender({ value: [1, 2, 5, 3, 99] })
        expect(result.current).toEqual([3, 2, 5, 1, 99])
    })

    test('shuffle values insert and remove', async () => {
        const { result, rerender } = setup()
        rerender({ value: [1, 5, 3, 99] })
        expect(result.current).toEqual([3, 5, 1, 99])
    })

    test('sequence', async () => {
        const { result, rerender } = setup()
        rerender({ value: [] })
        expect(result.current).toEqual([])
        rerender({ value: [3, 2, 1] })
        expect(result.current).toEqual([3, 2, 1])
        rerender({ value: [1, 3] })
        expect(result.current).toEqual([3, 1])
        rerender({ value: [1, 99, 3, 5] })
        expect(result.current).toEqual([3, 99, 1, 5])
    })
})

describe('usePersistOrder with sorting', () => {
    const setup = () =>
        renderHook(
            <T,>({ value }: { value: T[] }) =>
                usePersistOrder(value, { sorterFn: (t) => t.sort() }),
            { initialProps: { value: [3, 2, 1] } },
        )

    test('initial values sorted', async () => {
        const { result } = setup()
        expect(result.current).toEqual([1, 2, 3])
    })

    test('insert values to get inserted sorted', async () => {
        const { result, rerender } = setup()

        rerender({ value: [3, 2, 1, 2.5] })
        expect(result.current).toEqual([1, 2, 2.5, 3])
    })

    test('shuffle all values and insert values should keep initial order', async () => {
        const { result, rerender } = setup()

        rerender({ value: [2, 1, 2.5, 3] })
        expect(result.current).toEqual([1, 2, 2.5, 3])
    })
})

describe('usePersistOrder using identity function', () => {
    const setup = () =>
        renderHook(
            <T extends { id: string; date: number }>({ value }: { value: T[] }) =>
                usePersistOrder(value, {
                    identityFn: (t: T) => t.id,
                    sorterFn: (t: T[]) => t.sort((a, b) => a.date - b.date),
                }),
            {
                initialProps: {
                    value: [
                        { id: 'c', date: 20230103 },
                        { id: 'b', date: 20230102 },
                        { id: 'a', date: 20230101 },
                    ],
                },
            },
        )

    test('initial values get sorted', () => {
        const { result } = setup()
        expect(result.current).toEqual([
            { id: 'a', date: 20230101 },
            { id: 'b', date: 20230102 },
            { id: 'c', date: 20230103 },
        ])
    })

    test('initial values get sorted', () => {
        const { result, rerender } = setup()
        rerender({
            value: [
                { id: 'c', date: 20230103 },
                { id: 'b', date: 20230102 },
                { id: 'a', date: 20230105 },
            ],
        })

        expect(result.current).toEqual([
            { id: 'a', date: 20230105 },
            { id: 'b', date: 20230102 },
            { id: 'c', date: 20230103 },
        ])
    })
})
