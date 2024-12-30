import React, { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { TestApp } from 'test/testUtils'
import { parseUnits } from 'hooks/useBalance'
import { MOCK_ETH_PRICE } from '../../../mocks/ethPrice'
import { calculateEthAmountFromUsd, useEthPrice, useEthToUsdFormatted } from './useEthPrice'

const wrapper = ({ children }: { children: ReactNode }) => {
    return (
        <TestApp>
            <>{children}</>
        </TestApp>
    )
}

describe('useEthPrice', () => {
    it('should fetch and return ETH price', async () => {
        const { result } = renderHook(
            () =>
                useEthPrice({
                    enabled: true,
                    refetchInterval: 1,
                }),
            {
                wrapper,
            },
        )

        expect(result.current.isLoading).toBe(true)

        await waitFor(() => {
            expect(result.current.isLoading).toBe(false)
        })

        expect(result.current.data).toBe(MOCK_ETH_PRICE)
    })

    it('should accurately calculate eth amount from usd', () => {
        const { value: value100, formatted: formatted100 } = calculateEthAmountFromUsd({
            cents: 100,
            ethPriceInUsd: MOCK_ETH_PRICE,
        })

        expect(value100).toBe(304059935028219n)
        expect(formatted100).toBe('0.0003')

        const { value: value25, formatted: formatted25 } = calculateEthAmountFromUsd({
            cents: 25,
            ethPriceInUsd: MOCK_ETH_PRICE,
        })

        expect(value25).toBe(76014983757054n)
        expect(formatted25).toBe('0.00008')
    })

    it('should accurately calculate USD currency formatted from ETH', async () => {
        const eth = parseUnits('1') //1 ETH

        const { result } = renderHook(
            () =>
                useEthToUsdFormatted({
                    ethAmount: eth,
                    refetchInterval: 1,
                }),
            {
                wrapper,
            },
        )
        await waitFor(() => {
            expect(result.current).toBe('$3,288.83')
        })
    })
})
