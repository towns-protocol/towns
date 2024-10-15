import { create } from 'zustand'

export const useAppOverlayBugReport = create<{
    visible: boolean
    setVisible: (visible: boolean) => void
}>((set) => ({
    visible: false as boolean,
    setVisible: (visible: boolean) => set({ visible }),
}))
