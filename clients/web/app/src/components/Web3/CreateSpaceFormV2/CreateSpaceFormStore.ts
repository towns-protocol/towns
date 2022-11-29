import create from 'zustand'
import { isDev } from 'utils'
import { CreateSpaceFormState } from './types'
import { StoreMock } from './mock'

const withMock =
    isDev && new URLSearchParams(window.location.search).get('spaceFormMock') === 'true'

interface CreateSpaceActions {
    setStep1: (step1: CreateSpaceFormState['step1']) => void
    removeToken: (token: string) => void
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
}

if (withMock) {
    initialState = StoreMock
}

export const useCreateSpaceFormStore = create<CreateSpaceFormState & CreateSpaceActions>((set) => ({
    ...initialState,
    setStep1: (step1: CreateSpaceFormState['step1']) =>
        set((state) => ({
            ...state,
            step1,
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
}))
