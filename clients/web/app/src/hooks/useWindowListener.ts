import { useEffect } from 'react'
import { useStore } from 'store/store'

export const useWindowListener = () => {
    const isWindowFocused = useStore((state) => state.isWindowFocused)
    const setIsWindowFocused = useStore((state) => state.setIsWindowFocused)

    useEffect(() => {
        const checkFocus = () => {
            setIsWindowFocused(document.hasFocus())
        }

        checkFocus()
        window.addEventListener('blur', checkFocus)
        window.addEventListener('focus', checkFocus)

        return () => {
            window.removeEventListener('blur', checkFocus)
            window.removeEventListener('focus', checkFocus)
        }
    }, [setIsWindowFocused])

    return { isActiveWindow: isWindowFocused }
}
