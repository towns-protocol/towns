import { create } from 'zustand'

export const useUpdatePillStateStore = create<{
    isUpdatePillDisplaying: boolean
    setIsUpdatePillDisplaying: (isUpdatePillDisplaying: boolean) => void
}>((set) => ({
    isUpdatePillDisplaying: false,
    setIsUpdatePillDisplaying: (isUpdatePillDisplaying: boolean) => set({ isUpdatePillDisplaying }),
}))
