import { useEffect } from 'react'
import { useStore } from 'store/store'

export const useWindowListener = () => {
    const { isWindowFocused, setIsWindowFocused } = useStore(
        ({ isWindowFocused, setIsWindowFocused }) => ({
            isWindowFocused,
            setIsWindowFocused,
        }),
    )

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
