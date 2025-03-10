import { create } from 'zustand'

import { persist } from 'zustand/middleware'

export const useTradeSettings = create(
    persist<{
        slippage: number
        setSlippage: (slippage: number) => void
    }>(
        (set) => ({
            slippage: 0.01,
            setSlippage: (slippage: number) => set({ slippage }),
        }),
        {
            name: 'towns/trade-settings',
        },
    ),
)
