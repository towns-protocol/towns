import { useCallback } from 'react'
import { useStore } from 'store/store'
import { useDevice } from './useDevice'

export const useInstallPWAPrompt = () => {
    const { didClosePWAPrompt, setDidClosePWAPrompt } = useStore()
    const { isPWA, isIOS } = useDevice()

    const closePWAPrompt = useCallback(() => {
        setDidClosePWAPrompt(true)
    }, [setDidClosePWAPrompt])

    const shouldDisplayPWAPrompt = !didClosePWAPrompt && isIOS() && !isPWA
    return {
        shouldDisplayPWAPrompt,
        closePWAPrompt,
    }
}
