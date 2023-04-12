import { create } from 'zustand'
import { Address } from 'wagmi'
import { env } from 'utils'
import { CreateSpaceFormState } from './types'
import { StoreMockForManualSubmissionsNotToBeUsedInTests } from './mock'

const withMock =
    env.IS_DEV && new URLSearchParams(window.location.search).get('spaceFormMock') === 'true'

interface CreateSpaceActions {
    setStep1: (step1: CreateSpaceFormState['step1']) => void
    setStep2: (step1: CreateSpaceFormState['step2']) => void
    toggleToken: (token: string) => void
    clearTokens: () => void
    reset: () => void
    setImageData: (spaceImageData: CreateSpaceFormState['spaceImageData']) => void
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
    },
    // appears in step 2, but has no bearing on data submitted to blockchain/server, so treated as separate
    spaceImageData: null,
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
    setImageData: (spaceImageData: CreateSpaceFormState['spaceImageData']) => {
        set((state) => {
            return {
                ...state,
                spaceImageData,
            }
        })
    },
    toggleToken: (token: string) =>
        set((state) => {
            let tokens

            if (state.step1.tokens.includes(token)) {
                tokens = state.step1.tokens.filter((t) => t !== token)
            } else {
                tokens = [...state.step1.tokens, token]
            }

            return {
                ...state,
                step1: {
                    ...state.step1,
                    tokens,
                },
            }
        }),
    clearTokens: () => set((state) => ({ ...state, step1: { ...state.step1, tokens: [] } })),
    setCreatedSpaceId: (createdSpaceId: string) => set({ createdSpaceId }),
    setMintedTokenAddress: (mintedTokenAddress: Address) => set({ mintedTokenAddress }),
    reset: () => set(initialState),
}))
