import create from 'zustand'

export interface CreateSpaceFormState {
    step1: {
        membershipType: 'everyone' | 'tokenHolders' | undefined
        tokens: string[]
    }
}

interface CreateSpaceActions {
    setStep1: (step1: CreateSpaceFormState['step1']) => void
}

const initialState: CreateSpaceFormState = {
    step1: {
        membershipType: undefined,
        tokens: [],
    },
}

export const useCreateSpaceFormStore = create<CreateSpaceFormState & CreateSpaceActions>((set) => ({
    ...initialState,
    setStep1: (step1: CreateSpaceFormState['step1']) =>
        set((state) => ({
            ...state,
            step1,
        })),
}))
