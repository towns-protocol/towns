import create from 'zustand'
import { Address } from 'wagmi'
import { isDev } from 'utils'
import { CreateSpaceFormState } from './types'
import { StoreMockForManualSubmissionsNotToBeUsedInTests } from './mock'

const withMock =
    isDev && new URLSearchParams(window.location.search).get('spaceFormMock') === 'true'

interface CreateSpaceActions {
    setStep1: (step1: CreateSpaceFormState['step1']) => void
    setStep2: (step1: CreateSpaceFormState['step2']) => void
    removeToken: (token: string) => void
    reset: () => void
    setCreatedSpaceId: (createdSpaceId: string) => void
    setMintedTokenAddress: (mintedTokenAddress: Address) => void
}

let initialState: CreateSpaceFormState = {
    step1: {
        membershipType: null,
        tokens: [],
    },
    step2: {
        spaceName: null,
        spaceIconUrl: null,
    },
    createdSpaceId: null,
    mintedTokenAddress: null,
}

if (withMock) {
    initialState = StoreMockForManualSubmissionsNotToBeUsedInTests
}

export const useCreateSpaceFormStore = create<CreateSpaceFormState & CreateSpaceActions>((set) => ({
    ...initialState,
    setStep1: (step1: CreateSpaceFormState['step1']) =>
        set((state) => ({
            ...state,
            step1,
        })),
    setStep2: (step2: CreateSpaceFormState['step2']) =>
        set((state) => ({
            ...state,
            step2,
        })),
    removeToken: (token: string) =>
        set((state) => {
            const tokens = state.step1.tokens.filter((t) => t !== token)

            return {
                ...state,
                step1: {
                    ...state.step1,
                    tokens,
                },
            }
        }),
    setCreatedSpaceId: (createdSpaceId: string) => set({ createdSpaceId }),
    setMintedTokenAddress: (mintedTokenAddress: Address) => set({ mintedTokenAddress }),
    reset: () => set(initialState),
}))
